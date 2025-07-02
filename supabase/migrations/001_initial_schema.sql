-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ENUM Types
CREATE TYPE user_role_enum AS ENUM ('passenger', 'driver', 'both', 'admin');
CREATE TYPE language_code_enum AS ENUM ('en', 'si', 'ta');
CREATE TYPE trust_level_enum AS ENUM ('exceptional', 'excellent', 'good', 'fair', 'building', 'poor');
CREATE TYPE vehicle_type_enum AS ENUM ('car', 'van', 'tuk_tuk', 'bike', 'suv', 'luxury', 'any');
CREATE TYPE ride_status_enum AS ENUM (
  'requested', 
  'driver_assigned', 
  'driver_en_route', 
  'driver_arrived_pickup', 
  'ongoing', 
  'completed', 
  'cancelled_passenger', 
  'cancelled_driver', 
  'cancelled_system',
  'payment_pending',
  'payment_failed'
);
CREATE TYPE journey_status_enum AS ENUM ('open', 'bidding_closed', 'driver_selected', 'expired', 'cancelled', 'completed');
CREATE TYPE bid_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'cancelled_by_driver', 'expired_journey', 'expired_bidder');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'requires_action', 'cancelled');
CREATE TYPE moderation_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE notification_type_enum AS ENUM (
  'ride_request_new', 
  'ride_accepted_passenger',
  'ride_accepted_driver',
  'driver_en_route',
  'driver_arrived', 
  'ride_started', 
  'ride_completed_passenger',
  'ride_completed_driver',
  'payment_successful', 
  'payment_failed', 
  'bid_received_passenger', 
  'bid_accepted_driver',
  'bid_rejected_driver',
  'journey_expired_passenger', 
  'review_reminder_passenger',
  'review_reminder_driver',
  'review_moderated', 
  'new_review_received',
  'promo_offer', 
  'account_updated', 
  'security_alert', 
  'emergency_alert_passenger', 
  'emergency_alert_driver',
  'emergency_resolved',
  'gn_verification_update',
  'identity_verification_update',
  'driver_license_verification_update',
  'vehicle_verification_update',
  'wallet_credited',
  'wallet_debited',
  'message_received'
);
CREATE TYPE emergency_status_enum AS ENUM ('active', 'resolved', 'false_alarm');

-- Trigger function to update 'updated_at' columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  display_name TEXT,
  phone_number TEXT UNIQUE CHECK (phone_number ~ '^\+94[0-9]{9}$'), -- Sri Lankan format
  email TEXT UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
  role user_role_enum DEFAULT 'passenger'::user_role_enum NOT NULL,
  profile_picture_url TEXT,
  language_preference language_code_enum DEFAULT 'en'::language_code_enum NOT NULL,

  -- New driver/passenger profile enhancements
  languages_spoken TEXT[], -- Array of ISO-639-1 codes or free-text language names
  is_tourist_friendly BOOLEAN DEFAULT false NOT NULL, -- Flag drivers can set if they cater to tourists
  tour_guide_license_url TEXT, -- Optional proof of tour-guide license (for tourist-friendly drivers)
  
  -- Verification fields
  gn_division_id TEXT, -- Can FK to a grama_niladari_divisions table later
  gn_verified_status moderation_status_enum DEFAULT 'pending'::moderation_status_enum NOT NULL,
  gn_verification_documents JSONB, -- Array of {url: string, type: string, submitted_at: timestamptz}
  identity_verified_status moderation_status_enum DEFAULT 'pending'::moderation_status_enum NOT NULL,
  identity_verification_documents JSONB,
  phone_verified BOOLEAN DEFAULT false NOT NULL,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  
  -- Trust & Rating
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100) NOT NULL,
  trust_level trust_level_enum DEFAULT 'fair'::trust_level_enum NOT NULL,
  trust_score_breakdown JSONB, -- e.g., { "ride_completion": 20, "ratings_received": 15, "verification_level": 10, "community_reports": -5 }
  
  -- Driver specific fields
  is_available_for_rides BOOLEAN DEFAULT false,
  current_location GEOGRAPHY(Point, 4326),
  location_updated_at TIMESTAMPTZ,
  search_radius_km INTEGER DEFAULT 5 CHECK (search_radius_km > 0 AND search_radius_km <= 50),
  vehicle_details JSONB, -- { type: vehicle_type_enum, make: string, model: string, year: int, license_plate: string, color: string, capacity: int, registration_doc_url: string, insurance_doc_url: string }
  driver_license_verified_status moderation_status_enum DEFAULT 'pending'::moderation_status_enum,
  driver_license_documents JSONB, -- { front_url: string, back_url: string, expiry_date: date }
  vehicle_verified_status moderation_status_enum DEFAULT 'pending'::moderation_status_enum,
  vehicle_verification_documents JSONB, -- { registration_url: string, insurance_url: string, revenue_license_url: string }
  
  -- Aggregated ratings
  avg_rating_as_driver NUMERIC(3,2) DEFAULT 0.00 CHECK (avg_rating_as_driver >= 0 AND avg_rating_as_driver <= 5),
  reviews_count_as_driver INTEGER DEFAULT 0 CHECK (reviews_count_as_driver >= 0),
  avg_rating_as_passenger NUMERIC(3,2) DEFAULT 0.00 CHECK (avg_rating_as_passenger >= 0 AND avg_rating_as_passenger <= 5),
  reviews_count_as_passenger INTEGER DEFAULT 0 CHECK (reviews_count_as_passenger >= 0),
  
  -- Other
  emergency_contacts JSONB, -- Array of { name: string, phone: string, relationship: string }
  fcm_tokens TEXT[], -- For push notifications
  notification_preferences JSONB, -- e.g., { "ride_updates": true, "promotions": false, "sms_enabled": true, "email_enabled": false }
  wallet_balance NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (wallet_balance >= 0)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_current_location ON public.profiles USING GIST (current_location);
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_is_available_for_rides ON public.profiles (is_available_for_rides) WHERE role IN ('driver', 'both');
CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to create a profile entry when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name', -- Assuming display_name might be in raw_user_meta_data
    CASE 
      WHEN NEW.raw_user_meta_data->>'initial_role' = 'driver' THEN 'driver'::user_role_enum
      WHEN NEW.raw_user_meta_data->>'initial_role' = 'both' THEN 'both'::user_role_enum
      ELSE 'passenger'::user_role_enum
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table: grama_niladari_divisions (Basic structure)
CREATE TABLE public.grama_niladari_divisions (
  id TEXT PRIMARY KEY, -- e.g., 'COL/001/GN001'
  name_si TEXT,
  name_ta TEXT,
  name_en TEXT NOT NULL,
  ds_division_id TEXT, -- FK to a future ds_divisions table
  district_id TEXT, -- FK to a future districts table
  province_id TEXT, -- FK to a future provinces table
  boundary_polygon GEOGRAPHY(Polygon, 4326),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.grama_niladari_divisions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gn_divisions_boundary ON public.grama_niladari_divisions USING GIST (boundary_polygon);
CREATE TRIGGER handle_gn_divisions_updated_at BEFORE UPDATE ON public.grama_niladari_divisions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: journeys (Passenger ride requests for bidding)
CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
  dropoff_location GEOGRAPHY(Point, 4326) NOT NULL,
  pickup_address_line1 TEXT,
  pickup_address_line2 TEXT,
  pickup_city TEXT,
  dropoff_address_line1 TEXT,
  dropoff_address_line2 TEXT,
  dropoff_city TEXT,
  requested_pickup_time TIMESTAMPTZ NOT NULL,
  vehicle_types_preference vehicle_type_enum[],
  passenger_count INTEGER DEFAULT 1 NOT NULL CHECK (passenger_count > 0 AND passenger_count < 10),
  max_price_willing_to_pay NUMERIC(10,2) CHECK (max_price_willing_to_pay > 0),
  min_driver_trust_score_preference INTEGER DEFAULT 0 CHECK (min_driver_trust_score_preference >= 0 AND min_driver_trust_score_preference <= 100),
  -- Smart-filter & preference enhancements
  is_women_only BOOLEAN DEFAULT false NOT NULL, -- True if passenger requests women-only ride
  journey_preferences JSONB, -- Arbitrary key/value preferences (e.g., { "languages": ["en","si"], "tourist_friendly": true })
  status journey_status_enum DEFAULT 'open'::journey_status_enum NOT NULL,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_journeys_passenger_id ON public.journeys(passenger_id);
CREATE INDEX idx_journeys_status ON public.journeys(status);
CREATE INDEX idx_journeys_expires_at ON public.journeys(expires_at);
CREATE INDEX idx_journeys_pickup_location ON public.journeys USING GIST (pickup_location);
CREATE INDEX idx_journeys_dropoff_location ON public.journeys USING GIST (dropoff_location);
CREATE TRIGGER handle_journeys_updated_at BEFORE UPDATE ON public.journeys FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: bids (Driver bids on journeys)
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bid_amount NUMERIC(10,2) NOT NULL CHECK (bid_amount > 0),
  currency TEXT DEFAULT 'LKR' NOT NULL,
  driver_notes TEXT,
  proposed_pickup_time TIMESTAMPTZ,
  status bid_status_enum DEFAULT 'pending'::bid_status_enum NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_driver_bid_per_journey UNIQUE (journey_id, driver_id)
);
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bids_journey_id ON public.bids(journey_id);
CREATE INDEX idx_bids_driver_id ON public.bids(driver_id);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE TRIGGER handle_bids_updated_at BEFORE UPDATE ON public.bids FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: rides
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
  bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
  dropoff_location GEOGRAPHY(Point, 4326) NOT NULL,
  pickup_address TEXT,
  dropoff_address TEXT,
  status ride_status_enum DEFAULT 'requested'::ride_status_enum NOT NULL,
  vehicle_type_requested vehicle_type_enum,
  vehicle_type_actual vehicle_type_enum,
  estimated_fare NUMERIC(10,2),
  agreed_fare NUMERIC(10,2),
  final_fare NUMERIC(10,2),
  currency TEXT DEFAULT 'LKR' NOT NULL,
  estimated_distance_km NUMERIC(8,2),
  estimated_duration_minutes INTEGER,
  actual_distance_km NUMERIC(8,2),
  actual_duration_minutes INTEGER,
  actual_pickup_location GEOGRAPHY(Point, 4326),
  actual_dropoff_location GEOGRAPHY(Point, 4326),
  payment_status payment_status_enum DEFAULT 'pending'::payment_status_enum NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMPTZ,
  driver_en_route_at TIMESTAMPTZ,
  driver_arrived_at_pickup_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_party user_role_enum,
  cancellation_reason TEXT,
  passenger_rating_for_driver INTEGER CHECK (passenger_rating_for_driver >= 1 AND passenger_rating_for_driver <= 5),
  passenger_comment_for_driver TEXT,
  driver_rating_for_passenger INTEGER CHECK (driver_rating_for_passenger >= 1 AND driver_rating_for_passenger <= 5),
  driver_comment_for_passenger TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rides_passenger_id ON public.rides(passenger_id);
CREATE INDEX idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_rides_journey_id ON public.rides(journey_id);
CREATE INDEX idx_rides_bid_id ON public.rides(bid_id);
CREATE INDEX idx_rides_pickup_location ON public.rides USING GIST (pickup_location);
CREATE INDEX idx_rides_dropoff_location ON public.rides USING GIST (dropoff_location);
CREATE TRIGGER handle_rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_for_role user_role_enum NOT NULL, -- 'driver' if reviewer is passenger, 'passenger' if reviewer is driver
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  moderation_status moderation_status_enum DEFAULT 'pending'::moderation_status_enum NOT NULL,
  moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_review_per_ride_by_role UNIQUE (ride_id, reviewer_id, review_for_role)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reviews_ride_id ON public.reviews(ride_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE TRIGGER handle_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, -- Payer
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Payee (for ride payouts)
  amount NUMERIC(10,2) NOT NULL CHECK (amount != 0), -- Allow negative for refunds
  currency TEXT DEFAULT 'LKR' NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 0.00,
  driver_payout_amount NUMERIC(10,2),
  type TEXT NOT NULL CHECK (type IN ('ride_fare', 'wallet_topup', 'refund', 'driver_payout', 'cancellation_fee', 'admin_adjustment')),
  status payment_status_enum NOT NULL,
  payment_gateway TEXT, -- e.g., 'payhere', 'stripe', 'cash', 'wallet'
  gateway_transaction_id TEXT UNIQUE,
  gateway_response_details JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_ride_id ON public.payments(ride_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_driver_id ON public.payments(driver_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE TRIGGER handle_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: pricing_rules
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vehicle_type vehicle_type_enum NOT NULL,
  base_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_km_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_minute_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  peak_hours_multiplier NUMERIC(4,2) DEFAULT 1.00 CHECK (peak_hours_multiplier >= 1),
  peak_hours_fixed_surcharge NUMERIC(10,2) DEFAULT 0.00 CHECK (peak_hours_fixed_surcharge >= 0),
  night_hours_multiplier NUMERIC(4,2) DEFAULT 1.00 CHECK (night_hours_multiplier >= 1),
  night_hours_fixed_surcharge NUMERIC(10,2) DEFAULT 0.00 CHECK (night_hours_fixed_surcharge >= 0),
  currency TEXT DEFAULT 'LKR' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
  -- Removed unique constraint for now, as managing it via application logic might be more flexible
  -- Or, use a partial unique index:
  -- CONSTRAINT unique_active_rule_per_vehicle_type UNIQUE (vehicle_type) WHERE (is_active = true)
);
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pricing_rules_vehicle_type_active ON public.pricing_rules(vehicle_type, is_active);
CREATE TRIGGER handle_pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: app_settings (for global configurations like platform_fee_rate)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY; -- Usually only admin/service_role access
CREATE TRIGGER handle_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type_enum NOT NULL,
  title_key TEXT, -- Localization key for title
  body_key TEXT, -- Localization key for body
  template_data JSONB, -- Data to interpolate into title/body
  payload JSONB, -- Additional data for client-side navigation/action (e.g., { "rideId": "...", "screen": "RideDetails" })
  is_read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user_id_read_created ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Table: driver_availability_logs
CREATE TABLE public.driver_availability_logs (
  id BIGSERIAL PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available BOOLEAN NOT NULL,
  location_at_change GEOGRAPHY(Point, 4326),
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.driver_availability_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_driver_availability_logs_driver_timestamp ON public.driver_availability_logs(driver_id, timestamp DESC);

-- Table: ride_tracking_history (For Supabase, use regular table with composite PK or serial PK and index)
-- If using TimescaleDB, this would be a hypertable.
CREATE TABLE public.ride_tracking_history (
  id BIGSERIAL PRIMARY KEY, -- Simple PK for regular PG
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  speed_kmh NUMERIC(5,2),
  heading_degrees INTEGER CHECK (heading_degrees >= 0 AND heading_degrees < 360),
  recorded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ride_tracking_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ride_tracking_history_driver_recorded ON public.ride_tracking_history(driver_id, recorded_at DESC);
CREATE INDEX idx_ride_tracking_history_ride_id ON public.ride_tracking_history(ride_id);
CREATE INDEX idx_ride_tracking_history_location ON public.ride_tracking_history USING GIST (location);
-- For TimescaleDB, you would later run: SELECT create_hypertable('ride_tracking_history', 'recorded_at');

-- Table: live_ride_updates (Stores current live data for an active ride)
CREATE TABLE public.live_ride_updates (
  ride_id UUID PRIMARY KEY REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Denormalized for quick access
  driver_current_location GEOGRAPHY(Point, 4326),
  driver_heading INTEGER,
  driver_speed_kmh NUMERIC(5,2),
  passenger_current_location GEOGRAPHY(Point, 4326), -- If passenger shares
  eta_to_pickup_seconds INTEGER,
  eta_to_destination_seconds INTEGER,
  last_updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.live_ride_updates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_live_ride_updates_driver_id ON public.live_ride_updates(driver_id);
CREATE TRIGGER handle_live_ride_updates_updated_at BEFORE UPDATE ON public.live_ride_updates FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Table: emergencies
CREATE TABLE public.emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  trigger_location GEOGRAPHY(Point, 4326) NOT NULL,
  emergency_type TEXT NOT NULL, -- e.g., 'passenger_sos', 'driver_sos', 'accident_report', 'safety_concern'
  status emergency_status_enum DEFAULT 'active'::emergency_status_enum NOT NULL,
  additional_info TEXT,
  triggered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Admin who resolved
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_emergencies_user_id ON public.emergencies(user_id);
CREATE INDEX idx_emergencies_ride_id ON public.emergencies(ride_id);
CREATE INDEX idx_emergencies_status ON public.emergencies(status);
CREATE INDEX idx_emergencies_trigger_location ON public.emergencies USING GIST (trigger_location);
CREATE TRIGGER handle_emergencies_updated_at BEFORE UPDATE ON public.emergencies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Seed some app_settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('platform_fee_rate', '0.15', 'Default platform commission rate (e.g., 0.15 for 15%)'),
  ('min_trust_score_for_platform', '30', 'Minimum trust score required to use the platform actively'),
  ('default_search_radius_km', '10', 'Default search radius for drivers if not set on profile')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());

-- Function to calculate trust level based on score
CREATE OR REPLACE FUNCTION public.get_trust_level(score INTEGER)
RETURNS trust_level_enum AS $$
BEGIN
  IF score >= 90 THEN RETURN 'exceptional'::trust_level_enum;
  ELSIF score >= 80 THEN RETURN 'excellent'::trust_level_enum;
  ELSIF score >= 65 THEN RETURN 'good'::trust_level_enum;
  ELSIF score >= 50 THEN RETURN 'fair'::trust_level_enum;
  ELSIF score >= 30 THEN RETURN 'building'::trust_level_enum;
  ELSE RETURN 'poor'::trust_level_enum;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update trust_level when trust_score changes on profiles table
CREATE OR REPLACE FUNCTION public.update_profile_trust_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trust_level = public.get_trust_level(NEW.trust_score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_trust_level
BEFORE INSERT OR UPDATE OF trust_score ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_trust_level();

-- Function to update average ratings on profiles when a review is approved
CREATE OR REPLACE FUNCTION public.update_profile_ratings_from_review()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
  profile_id_to_update UUID;
  rating_field_to_update TEXT;
  count_field_to_update TEXT;
BEGIN
  -----------------------------------------------------------------
  -- Exit early unless:
  --   • NEW.moderation_status = 'approved'
  --   • (INSERT)  OR  (UPDATE where status actually changed)
  -----------------------------------------------------------------
  IF NOT (
       NEW.moderation_status = 'approved'::moderation_status_enum
       AND (
         TG_OP = 'INSERT'
         OR (TG_OP = 'UPDATE' AND OLD.moderation_status IS DISTINCT FROM NEW.moderation_status)
       )
     ) THEN
     RETURN NEW;
  END IF;

  -- Determine which profile and fields to update based on the review
  profile_id_to_update := NEW.reviewee_id;
  IF NEW.review_for_role = 'driver' THEN
    rating_field_to_update := 'avg_rating_as_driver';
    count_field_to_update := 'reviews_count_as_driver';
  ELSIF NEW.review_for_role = 'passenger' THEN
    rating_field_to_update := 'avg_rating_as_passenger';
    count_field_to_update := 'reviews_count_as_passenger';
  ELSE
    RETURN NEW; -- Should not happen if review_for_role is properly set
  END IF;

  -- Calculate new average rating and count for the reviewee
  SELECT
    AVG(r.rating)::NUMERIC(3,2),
    COUNT(r.id)
  INTO
    avg_rating,
    review_count
  FROM public.reviews r
  WHERE r.reviewee_id = profile_id_to_update
    AND r.review_for_role = NEW.review_for_role
    AND r.moderation_status = 'approved'::moderation_status_enum;

  -- Update the profiles table
  EXECUTE format(
    'UPDATE public.profiles SET %I = $1, %I = $2, updated_at = timezone(''utc''::text, now()) WHERE id = $3',
    rating_field_to_update,
    count_field_to_update
  ) USING COALESCE(avg_rating, 0), COALESCE(review_count, 0), profile_id_to_update;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update profile ratings when a review's moderation_status changes TO 'approved'
-- Or when a new 'approved' review is inserted
CREATE TRIGGER trigger_review_moderation_update_ratings
AFTER INSERT OR UPDATE OF moderation_status ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_ratings_from_review();

-- Trigger to update profile ratings if an approved review is deleted (e.g. due to GDPR request or admin action)
-- This is more complex as it requires re-calculation. A simpler approach is to mark reviews as 'archived' instead of hard delete.
-- For now, this trigger handles recalculation on deletion of an approved review.
CREATE OR REPLACE FUNCTION public.handle_deleted_approved_review()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
  profile_id_to_update UUID;
  rating_field_to_update TEXT;
  count_field_to_update TEXT;
BEGIN
  -- Determine which profile and fields to update based on the deleted review
  profile_id_to_update := OLD.reviewee_id;
  IF OLD.review_for_role = 'driver' THEN
    rating_field_to_update := 'avg_rating_as_driver';
    count_field_to_update := 'reviews_count_as_driver';
  ELSIF OLD.review_for_role = 'passenger' THEN
    rating_field_to_update := 'avg_rating_as_passenger';
    count_field_to_update := 'reviews_count_as_passenger';
  ELSE
    RETURN OLD; 
  END IF;

  -- Recalculate average rating and count for the reviewee
  SELECT
    AVG(r.rating)::NUMERIC(3,2),
    COUNT(r.id)
  INTO
    avg_rating,
    review_count
  FROM public.reviews r
  WHERE r.reviewee_id = profile_id_to_update
    AND r.review_for_role = OLD.review_for_role
    AND r.moderation_status = 'approved'::moderation_status_enum;

  -- Update the profiles table
  EXECUTE format(
    'UPDATE public.profiles SET %I = $1, %I = $2, updated_at = timezone(''utc''::text, now()) WHERE id = $3',
    rating_field_to_update,
    count_field_to_update
  ) USING COALESCE(avg_rating, 0), COALESCE(review_count, 0), profile_id_to_update;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_deleted_approved_review_update_ratings
AFTER DELETE ON public.reviews
FOR EACH ROW
WHEN (OLD.moderation_status = 'approved'::moderation_status_enum)
EXECUTE FUNCTION public.handle_deleted_approved_review();

-- Ensure auth.users.phone is unique if it isn't already by Supabase default
-- Supabase usually handles this, but good to be aware.
-- ALTER TABLE auth.users ADD CONSTRAINT auth_users_phone_unique UNIQUE (phone);

-- Grant usage on schema public to postgres and anon roles
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant select on all tables to anon and authenticated for RLS to take effect
-- More granular permissions will be handled by RLS policies.
-- This is a broad grant; in production, you might be more specific
-- about which tables anon can even attempt to select from.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Allow authenticated users to insert, update, delete on tables they own or have explicit RLS for.
-- These are general grants; RLS policies will enforce actual permissions.
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Service role gets all privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- (Supabase automatically provisions supabase_functions_admin with
--   appropriate privileges.  Commenting out explicit grants to avoid
--   migration failure if the role does not yet exist.)
-- GRANT USAGE ON SCHEMA public TO supabase_functions_admin;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_functions_admin;

-- Allow authenticated role to use functions they need (e.g., get_trust_level if it were not IMMUTABLE and SECURITY DEFINER)
-- GRANT EXECUTE ON FUNCTION public.get_trust_level(integer) TO authenticated;
