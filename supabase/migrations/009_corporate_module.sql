-- supabase/migrations/009_corporate_module.sql
-- This migration adds the necessary tables and RLS policies for the YALURIDE Corporate Portal feature.

-- ---------------------------------------------------------------------------
-- 1. Create ENUM Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.company_employee_role AS ENUM (
  'ADMIN',
  'MEMBER'
);

CREATE TYPE public.company_employee_status AS ENUM (
  'invited',
  'active',
  'deactivated'
);

-- ---------------------------------------------------------------------------
-- 2. Create Tables
-- ---------------------------------------------------------------------------

-- Table: companies
-- Stores information about companies using the corporate portal.
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) > 2),
  address TEXT,
  contact_email TEXT NOT NULL UNIQUE CHECK (contact_email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.companies IS 'Stores details of companies registered for the corporate portal.';

-- Table: company_employees
-- Links user profiles to companies, defining their role and status within the company.
CREATE TABLE public.company_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.company_employee_role NOT NULL DEFAULT 'MEMBER',
  status public.company_employee_status NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (company_id, employee_id)
);

COMMENT ON TABLE public.company_employees IS 'Links employees (user profiles) to their respective companies.';

-- Table: travel_policies
-- Defines travel policies for a company.
CREATE TABLE public.travel_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  spending_limit_per_ride NUMERIC(10, 2) CHECK (spending_limit_per_ride >= 0),
  allowed_vehicle_types public.vehicle_type[], -- Reusing the vehicle_type enum
  time_restrictions JSONB, -- e.g., {"days": [1,2,3,4,5], "startTime": "08:00", "endTime": "20:00"}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.travel_policies IS 'Defines travel rules and restrictions for a company.';

-- ---------------------------------------------------------------------------
-- 3. Modify Existing Tables
-- ---------------------------------------------------------------------------

-- Add a column to the `rides` table to associate it with a corporate booking.
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS billed_to_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rides.billed_to_company_id IS 'If not NULL, indicates the ride was billed to a company.';

-- ---------------------------------------------------------------------------
-- 4. Add Indexes and Triggers
-- ---------------------------------------------------------------------------

-- Indexes
CREATE INDEX idx_companies_created_by ON public.companies(created_by);
CREATE INDEX idx_company_employees_company_id ON public.company_employees(company_id);
CREATE INDEX idx_company_employees_employee_id ON public.company_employees(employee_id);
CREATE INDEX idx_travel_policies_company_id ON public.travel_policies(company_id);
CREATE INDEX idx_rides_billed_to_company_id ON public.rides(billed_to_company_id);

-- Triggers
CREATE TRIGGER handle_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_company_employees_updated_at BEFORE UPDATE ON public.company_employees FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_travel_policies_updated_at BEFORE UPDATE ON public.travel_policies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Helper Function for RLS
-- ---------------------------------------------------------------------------

-- This function checks if a user is an admin of a given company.
CREATE OR REPLACE FUNCTION public.is_company_admin(p_company_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_employees
    WHERE company_id = p_company_id
      AND employee_id = p_user_id
      AND role = 'ADMIN'
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 6. Enable and Define RLS Policies
-- ---------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_policies ENABLE ROW LEVEL SECURITY;

-- Policies for `companies`
DROP POLICY IF EXISTS "Company admins can manage their own company" ON public.companies;
CREATE POLICY "Company admins can manage their own company"
  ON public.companies FOR ALL
  USING (public.is_company_admin(id, public.requesting_user_id()));

DROP POLICY IF EXISTS "Company members can view their own company details" ON public.companies;
CREATE POLICY "Company members can view their own company details"
  ON public.companies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.company_employees
    WHERE company_id = id AND employee_id = public.requesting_user_id()
  ));

-- Policies for `company_employees`
DROP POLICY IF EXISTS "Company admins can manage their company's employees" ON public.company_employees;
CREATE POLICY "Company admins can manage their company's employees"
  ON public.company_employees FOR ALL
  USING (public.is_company_admin(company_id, public.requesting_user_id()));

DROP POLICY IF EXISTS "Employees can view their own company membership" ON public.company_employees;
CREATE POLICY "Employees can view their own company membership"
  ON public.company_employees FOR SELECT
  USING (employee_id = public.requesting_user_id());

-- Policies for `travel_policies`
DROP POLICY IF EXISTS "Company admins can manage their company's travel policies" ON public.travel_policies;
CREATE POLICY "Company admins can manage their company's travel policies"
  ON public.travel_policies FOR ALL
  USING (public.is_company_admin(company_id, public.requesting_user_id()));

DROP POLICY IF EXISTS "Company members can view their company's active travel policies" ON public.travel_policies;
CREATE POLICY "Company members can view their company's active travel policies"
  ON public.travel_policies FOR SELECT
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.company_employees
    WHERE company_id = public.travel_policies.company_id AND employee_id = public.requesting_user_id()
  ));

-- Policy for `rides` table (modification)
DROP POLICY IF EXISTS "Users can view rides billed to their company" ON public.rides;
CREATE POLICY "Users can view rides billed to their company"
  ON public.rides FOR SELECT
  USING (
    -- Normal condition: user is passenger or driver
    (passenger_id = public.requesting_user_id() OR driver_id = public.requesting_user_id()) OR
    -- Corporate condition: user is an admin of the billed company
    (billed_to_company_id IS NOT NULL AND public.is_company_admin(billed_to_company_id, public.requesting_user_id()))
  );
