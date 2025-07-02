-- supabase/migrations/006_tourist_module.sql
-- This script adds the necessary tables and policies for the YALURIDE Tourist Packages feature.

-- ---------------------------------------------------------------------------
-- 1. Create ENUM Types
-- ---------------------------------------------------------------------------

CREATE TYPE tour_booking_status_enum AS ENUM (
  'pending_confirmation', -- Awaiting driver confirmation
  'confirmed',            -- Driver has confirmed the booking
  'completed',            -- The tour has been completed
  'cancelled_by_passenger',
  'cancelled_by_driver',
  'rejected_by_driver'
);

-- ---------------------------------------------------------------------------
-- 2. Create Tables
-- ---------------------------------------------------------------------------

-- Table: tour_packages
-- Stores the main details of a tour package offered by a driver.
CREATE TABLE public.tour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 5),
  description TEXT,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0 AND duration_days < 30),
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  currency TEXT DEFAULT 'LKR' NOT NULL,
  included_services TEXT[], -- e.g., ARRAY['Accommodation', 'Breakfast', 'Private Vehicle']
  excluded_services TEXT[], -- e.g., ARRAY['Entrance Tickets', 'Lunch & Dinner']
  max_travelers INTEGER NOT NULL DEFAULT 1 CHECK (max_travelers > 0 AND max_travelers < 20),
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.tour_packages IS 'Stores tour packages created by drivers.';
COMMENT ON COLUMN public.tour_packages.driver_id IS 'The driver offering the tour package.';
COMMENT ON COLUMN public.tour_packages.is_active IS 'Whether the tour package is visible to passengers.';

-- Table: tour_itinerary_items
-- Stores the day-by-day itinerary for a specific tour package.
CREATE TABLE public.tour_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_package_id UUID NOT NULL REFERENCES public.tour_packages(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  locations_to_visit TEXT[],
  estimated_travel_time_hours NUMERIC(4, 1),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (tour_package_id, day_number)
);

COMMENT ON TABLE public.tour_itinerary_items IS 'Details of each day''s plan within a tour package.';

-- Table: tour_bookings
-- Stores bookings made by passengers for tour packages.
CREATE TABLE public.tour_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_package_id UUID NOT NULL REFERENCES public.tour_packages(id) ON DELETE RESTRICT,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Denormalized for easier access control
  start_date DATE NOT NULL,
  number_of_travelers INTEGER NOT NULL CHECK (number_of_travelers > 0),
  total_price NUMERIC(12, 2) NOT NULL,
  status tour_booking_status_enum DEFAULT 'pending_confirmation'::tour_booking_status_enum NOT NULL,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.tour_bookings IS 'Records passenger bookings for tour packages.';
COMMENT ON COLUMN public.tour_bookings.driver_id IS 'Denormalized driver ID for simpler RLS policies.';

-- ---------------------------------------------------------------------------
-- 3. Add Indexes and Triggers
-- ---------------------------------------------------------------------------

-- Indexes for tour_packages
CREATE INDEX idx_tour_packages_driver_id ON public.tour_packages(driver_id);
CREATE INDEX idx_tour_packages_is_active ON public.tour_packages(is_active);

-- Indexes for tour_itinerary_items
CREATE INDEX idx_tour_itinerary_items_tour_package_id ON public.tour_itinerary_items(tour_package_id);

-- Indexes for tour_bookings
CREATE INDEX idx_tour_bookings_tour_package_id ON public.tour_bookings(tour_package_id);
CREATE INDEX idx_tour_bookings_passenger_id ON public.tour_bookings(passenger_id);
CREATE INDEX idx_tour_bookings_driver_id ON public.tour_bookings(driver_id);
CREATE INDEX idx_tour_bookings_status ON public.tour_bookings(status);

-- Add updated_at triggers
CREATE TRIGGER handle_tour_packages_updated_at BEFORE UPDATE ON public.tour_packages FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_tour_itinerary_items_updated_at BEFORE UPDATE ON public.tour_itinerary_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_tour_bookings_updated_at BEFORE UPDATE ON public.tour_bookings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.tour_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_bookings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. Define RLS Policies
-- ---------------------------------------------------------------------------

-- Policies for `tour_packages`
DROP POLICY IF EXISTS "Public can view active tour packages" ON public.tour_packages;
CREATE POLICY "Public can view active tour packages"
  ON public.tour_packages FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Drivers can manage their own tour packages" ON public.tour_packages;
CREATE POLICY "Drivers can manage their own tour packages"
  ON public.tour_packages FOR ALL
  USING (driver_id = public.requesting_user_id())
  WITH CHECK (
    driver_id = public.requesting_user_id() AND
    public.get_user_role(public.requesting_user_id()) IN ('driver', 'both')
  );

-- Policies for `tour_itinerary_items`
DROP POLICY IF EXISTS "Public can view itinerary of active packages" ON public.tour_itinerary_items;
CREATE POLICY "Public can view itinerary of active packages"
  ON public.tour_itinerary_items FOR SELECT
  USING (
    (SELECT is_active FROM public.tour_packages WHERE id = tour_package_id) = true
  );

DROP POLICY IF EXISTS "Drivers can manage their own tour itineraries" ON public.tour_itinerary_items;
CREATE POLICY "Drivers can manage their own tour itineraries"
  ON public.tour_itinerary_items FOR ALL
  USING (
    (SELECT driver_id FROM public.tour_packages WHERE id = tour_package_id) = public.requesting_user_id()
  );

-- Policies for `tour_bookings`
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.tour_bookings;
CREATE POLICY "Users can view their own bookings"
  ON public.tour_bookings FOR SELECT
  USING (
    passenger_id = public.requesting_user_id() OR
    driver_id = public.requesting_user_id()
  );

DROP POLICY IF EXISTS "Passengers can create bookings for themselves" ON public.tour_bookings;
CREATE POLICY "Passengers can create bookings for themselves"
  ON public.tour_bookings FOR INSERT
  WITH CHECK (passenger_id = public.requesting_user_id());

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.tour_bookings;
CREATE POLICY "Users can update their own bookings"
  ON public.tour_bookings FOR UPDATE
  USING (
    -- Passenger can cancel a pending booking
    (passenger_id = public.requesting_user_id() AND status = 'pending_confirmation') OR
    -- Driver can confirm or reject a pending booking
    (driver_id = public.requesting_user_id() AND status = 'pending_confirmation')
  );

-- Allow admins to have full access (useful for support and moderation)
DROP POLICY IF EXISTS "Admins can manage all tourist data" ON public.tour_packages;
CREATE POLICY "Admins can manage all tourist data" ON public.tour_packages FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all tourist data" ON public.tour_itinerary_items;
CREATE POLICY "Admins can manage all tourist data" ON public.tour_itinerary_items FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all tourist data" ON public.tour_bookings;
CREATE POLICY "Admins can manage all tourist data" ON public.tour_bookings FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');
