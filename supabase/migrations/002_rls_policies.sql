-- supabase/migrations/002_rls_policies.sql
-- This script sets up Row Level Security (RLS) for the YALURIDE platform.
-- It ensures that users can only access and modify data they are permitted to see.

-- ---------------------------------------------------------------------------
-- Helper Functions
-- ---------------------------------------------------------------------------

-- Helper function to get the current user's ID from the JWT.
CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get the role of a user from their profile.
-- SECURITY DEFINER is used to bypass RLS on the profiles table when called from other policies.
-- This is a trusted function and should be reviewed carefully for security.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role_enum AS $$
DECLARE
  user_role user_role_enum;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- RLS Policies for `profiles` table
-- ---------------------------------------------------------------------------
-- 1. Admin Full Access Policy
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
CREATE POLICY "Admin can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin')
  WITH CHECK (public.get_user_role(public.requesting_user_id()) = 'admin'); -- ensure data-changes are still scoped

-- 2. Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = public.requesting_user_id());

-- 3. Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = public.requesting_user_id())
  WITH CHECK (id = public.requesting_user_id());

-- 4. Authenticated users can view basic info of other users (e.g., a driver's public profile)
-- NOTE: This is a broad policy. For production, it's better to create a `public_profiles` VIEW
-- with only non-sensitive columns and grant access to that instead.
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view other profiles"
  ON public.profiles FOR SELECT
  USING (
    -- limit to authenticated users that are drivers or hybrid users
    auth.role() = 'authenticated'
    AND public.get_user_role(public.requesting_user_id()) IN ('driver', 'both')
  );


-- ---------------------------------------------------------------------------
-- RLS Policies for `rides` table
-- ---------------------------------------------------------------------------
-- 1. Admin Full Access Policy
DROP POLICY IF EXISTS "Admin can manage all rides" ON public.rides;
CREATE POLICY "Admin can manage all rides"
  ON public.rides FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin')
  WITH CHECK (public.get_user_role(public.requesting_user_id()) = 'admin');

-- 2. Passenger and Driver can view their own ride details
DROP POLICY IF EXISTS "Passenger and Driver can view their own rides" ON public.rides;
CREATE POLICY "Passenger and Driver can view their own rides"
  ON public.rides FOR SELECT
  USING (passenger_id = public.requesting_user_id() OR driver_id = public.requesting_user_id());

-- 3. Passengers can create ride requests for themselves
DROP POLICY IF EXISTS "Passengers can create their own ride requests" ON public.rides;
CREATE POLICY "Passengers can create their own ride requests"
  ON public.rides FOR INSERT
  WITH CHECK (passenger_id = public.requesting_user_id());

-- 4. Users can update their own rides based on their role and ride status
DROP POLICY IF EXISTS "Users can update their own rides" ON public.rides;
CREATE POLICY "Users can update their own rides"
  ON public.rides FOR UPDATE
  USING (
    -- Passenger can cancel if the ride is requested or driver assigned
    (passenger_id = public.requesting_user_id() AND status IN ('requested', 'driver_assigned')) OR
    -- Driver can update if they are the assigned driver (e.g., accept, start, complete)
    (driver_id = public.requesting_user_id())
  );

-- 5. Deleting rides should be restricted (typically an admin-only task)
-- The admin policy already covers this. No additional policy for regular users.


-- ---------------------------------------------------------------------------
-- RLS Policies for `journeys` table (Passenger requests for bidding)
-- ---------------------------------------------------------------------------
-- 1. Admin Full Access Policy
DROP POLICY IF EXISTS "Admin can manage all journeys" ON public.journeys;
CREATE POLICY "Admin can manage all journeys"
  ON public.journeys FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin')
  WITH CHECK (public.get_user_role(public.requesting_user_id()) = 'admin');

-- 2. Passengers can manage their own journeys
DROP POLICY IF EXISTS "Passengers can manage their own journeys" ON public.journeys;
CREATE POLICY "Passengers can manage their own journeys"
  ON public.journeys FOR ALL
  USING (passenger_id = public.requesting_user_id())
  WITH CHECK (passenger_id = public.requesting_user_id());

-- 3. Drivers can view open journeys
DROP POLICY IF EXISTS "Drivers can view open journeys" ON public.journeys;
CREATE POLICY "Drivers can view open journeys"
  ON public.journeys FOR SELECT
  USING (
    status = 'open' AND
    public.get_user_role(public.requesting_user_id()) IN ('driver', 'both')
  );


-- ---------------------------------------------------------------------------
-- RLS Policies for `bids` table
-- ---------------------------------------------------------------------------
-- 1. Admin Full Access Policy
DROP POLICY IF EXISTS "Admin can manage all bids" ON public.bids;
CREATE POLICY "Admin can manage all bids"
  ON public.bids FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin')
  WITH CHECK (public.get_user_role(public.requesting_user_id()) = 'admin');

-- 2. Drivers can create and manage their own bids
DROP POLICY IF EXISTS "Drivers can manage their own bids" ON public.bids;
CREATE POLICY "Drivers can manage their own bids"
  ON public.bids FOR ALL
  USING (driver_id = public.requesting_user_id())
  WITH CHECK (
    driver_id = public.requesting_user_id() AND
    -- Ensure driver is bidding on an open journey
    (SELECT status FROM public.journeys WHERE id = journey_id) = 'open'
  );

-- 3. Passengers can view bids on their own journeys
DROP POLICY IF EXISTS "Passengers can view bids on their journeys" ON public.bids;
CREATE POLICY "Passengers can view bids on their journeys"
  ON public.bids FOR SELECT
  USING (
    (SELECT passenger_id FROM public.journeys WHERE id = journey_id) = public.requesting_user_id()
  );


-- ---------------------------------------------------------------------------
-- RLS Policies for `payments` table
-- ---------------------------------------------------------------------------
-- 1. Admin Full Access Policy
DROP POLICY IF EXISTS "Admin can manage all payments" ON public.payments;
CREATE POLICY "Admin can manage all payments"
  ON public.payments FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin')
  WITH CHECK (public.get_user_role(public.requesting_user_id()) = 'admin');

-- 2. Users can only view their own payment records
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (user_id = public.requesting_user_id());

-- 3. Drivers can view their payout records
DROP POLICY IF EXISTS "Drivers can view their payouts" ON public.payments;
CREATE POLICY "Drivers can view their payouts"
  ON public.payments FOR SELECT
  USING (
    driver_id = public.requesting_user_id() AND
    type = 'driver_payout'
  );

-- NOTE: INSERT, UPDATE, DELETE on payments should be handled by the backend service
-- using the `service_role` key, so no policies are needed for these actions for regular users.


-- ---------------------------------------------------------------------------
-- RLS Policies for other tables (examples)
-- ---------------------------------------------------------------------------

-- Reviews Table
DROP POLICY IF EXISTS "Users can manage their own reviews" ON public.reviews;
CREATE POLICY "Users can manage their own reviews"
  ON public.reviews FOR ALL
  USING (reviewer_id = public.requesting_user_id());

DROP POLICY IF EXISTS "Users can view approved reviews about them" ON public.reviews;
CREATE POLICY "Users can view approved reviews about them"
  ON public.reviews FOR SELECT
  USING (reviewee_id = public.requesting_user_id() AND moderation_status = 'approved');

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (moderation_status = 'approved');


-- Notifications Table
DROP POLICY IF EXISTS "Users can only access their own notifications" ON public.notifications;
CREATE POLICY "Users can only access their own notifications"
  ON public.notifications FOR ALL
  USING (user_id = public.requesting_user_id())
  WITH CHECK (user_id = public.requesting_user_id());

-- Grant usage on helper functions to authenticated role
GRANT EXECUTE ON FUNCTION public.requesting_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
