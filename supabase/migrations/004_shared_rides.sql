-- supabase/migrations/004_shared_rides.sql
-- This migration adds the necessary tables and RLS policies for the Shared Rides (Pooling) feature.

-- ---------------------------------------------------------------------------
-- 1. Create ENUM Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.ride_type_enum AS ENUM (
  'PRIVATE',
  'SHARED'
);

CREATE TYPE public.shared_ride_request_status AS ENUM (
  'pending',    -- Waiting for a driver match
  'matched',    -- Matched with a driver and included in an active ride
  'expired',    -- No match found within the time window
  'cancelled'   -- Cancelled by the passenger
);

CREATE TYPE public.ride_passenger_status AS ENUM (
  'en_route_to_pickup', -- Driver is on the way to pick up this passenger
  'on_board',           -- Passenger is in the vehicle
  'dropped_off'         -- Passenger has completed their leg of the journey
);

-- ---------------------------------------------------------------------------
-- 2. Modify Existing Tables
-- ---------------------------------------------------------------------------

-- Add a `ride_type` column to the `rides` table to differentiate ride types.
ALTER TABLE public.rides
ADD COLUMN ride_type public.ride_type_enum NOT NULL DEFAULT 'PRIVATE';

-- ---------------------------------------------------------------------------
-- 3. Create New Tables
-- ---------------------------------------------------------------------------

-- Table: shared_ride_requests
-- Stores individual passenger requests for a shared ride.
CREATE TABLE public.shared_ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
  dropoff_address TEXT NOT NULL,
  
  requested_seats INT NOT NULL DEFAULT 1 CHECK (requested_seats > 0 AND requested_seats < 5),
  
  earliest_pickup_time TIMESTAMPTZ NOT NULL,
  latest_pickup_time TIMESTAMPTZ NOT NULL,
  
  status public.shared_ride_request_status NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT pickup_dropoff_different CHECK (pickup_location <> dropoff_location),
  CONSTRAINT time_window_valid CHECK (latest_pickup_time > earliest_pickup_time)
);

COMMENT ON TABLE public.shared_ride_requests IS 'Stores individual passenger requests for a shared ride.';
COMMENT ON COLUMN public.shared_ride_requests.status IS 'The current status of the passenger''s request.';

-- Table: ride_passengers
-- A linking table to associate multiple passenger requests with a single consolidated shared ride.
CREATE TABLE public.ride_passengers (
  id BIGSERIAL PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  shared_ride_request_id UUID NOT NULL REFERENCES public.shared_ride_requests(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Denormalized for easier RLS
  
  pickup_order INT, -- The sequence number for this passenger's pickup
  dropoff_order INT, -- The sequence number for this passenger's dropoff
  
  status public.ride_passenger_status NOT NULL DEFAULT 'en_route_to_pickup',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  UNIQUE (ride_id, shared_ride_request_id)
);

COMMENT ON TABLE public.ride_passengers IS 'Links passengers (via their requests) to a consolidated shared ride.';
COMMENT ON COLUMN public.ride_passengers.pickup_order IS 'The stop number for this passenger''s pickup in the driver''s itinerary.';

-- ---------------------------------------------------------------------------
-- 4. Add Indexes and Triggers
-- ---------------------------------------------------------------------------

-- Indexes for `shared_ride_requests`
CREATE INDEX idx_shared_ride_requests_passenger_id ON public.shared_ride_requests(passenger_id);
CREATE INDEX idx_shared_ride_requests_status ON public.shared_ride_requests(status);
-- Geospatial index for finding nearby requests efficiently
CREATE INDEX idx_shared_ride_requests_pickup_location ON public.shared_ride_requests USING GIST(pickup_location);

-- Indexes for `ride_passengers`
CREATE INDEX idx_ride_passengers_ride_id ON public.ride_passengers(ride_id);
CREATE INDEX idx_ride_passengers_passenger_id ON public.ride_passengers(passenger_id);

-- Add updated_at triggers
CREATE TRIGGER handle_shared_ride_requests_updated_at BEFORE UPDATE ON public.shared_ride_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.shared_ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_passengers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. Define RLS Policies
-- ---------------------------------------------------------------------------

-- Policies for `shared_ride_requests`
DROP POLICY IF EXISTS "Passengers can manage their own shared ride requests" ON public.shared_ride_requests;
CREATE POLICY "Passengers can manage their own shared ride requests"
  ON public.shared_ride_requests FOR ALL
  USING (passenger_id = public.requesting_user_id())
  WITH CHECK (passenger_id = public.requesting_user_id());

DROP POLICY IF EXISTS "Drivers can view pending requests near them" ON public.shared_ride_requests;
CREATE POLICY "Drivers can view pending requests near them"
  ON public.shared_ride_requests FOR SELECT
  USING (
    status = 'pending' AND
    public.get_user_role(public.requesting_user_id()) IN ('driver', 'both') AND
    -- This requires a function that gets the driver's current location from the `profiles` table.
    -- For demonstration, we assume such a function `get_driver_current_location(uuid)` exists.
    ST_DWithin(
      pickup_location,
      public.get_driver_current_location(public.requesting_user_id()),
      10000 -- Drivers can see requests within a 10km radius
    )
  );

-- Policies for `ride_passengers`
DROP POLICY IF EXISTS "Participants of a shared ride can view their own link record" ON public.ride_passengers;
CREATE POLICY "Participants of a shared ride can view their own link record"
  ON public.ride_passengers FOR SELECT
  USING (
    -- The passenger of this specific leg can see it
    passenger_id = public.requesting_user_id() OR
    -- The driver of the overall ride can see it
    (SELECT driver_id FROM public.rides WHERE id = ride_id) = public.requesting_user_id()
  );

-- Admin override policies
DROP POLICY IF EXISTS "Admins can manage all shared ride data" ON public.shared_ride_requests;
CREATE POLICY "Admins can manage all shared ride data" ON public.shared_ride_requests FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all ride passenger links" ON public.ride_passengers;
CREATE POLICY "Admins can manage all ride passenger links" ON public.ride_passengers FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');
