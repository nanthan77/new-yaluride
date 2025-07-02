-- supabase/migrations/007_promotions_module.sql
-- This migration adds the necessary tables and policies for the YALURIDE Promotions and Vouchers feature.

-- ---------------------------------------------------------------------------
-- 1. Create ENUM Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.discount_type_enum AS ENUM (
  'FIXED_AMOUNT',
  'PERCENTAGE'
);

CREATE TYPE public.user_voucher_status AS ENUM (
  'ACTIVE',   -- The user can use this voucher.
  'REDEEMED', -- The voucher has been used on a ride.
  'EXPIRED'   -- The voucher has passed its expiration date.
);

-- ---------------------------------------------------------------------------
-- 2. Create Tables
-- ---------------------------------------------------------------------------

-- Table: vouchers
-- Stores the definitions of all promotional vouchers available on the platform.
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (char_length(code) > 4 AND char_length(code) < 20),
  description TEXT NOT NULL,
  
  discount_type public.discount_type_enum NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  
  max_discount_amount NUMERIC(10, 2) CHECK (max_discount_amount > 0), -- Only applicable for PERCENTAGE type
  min_ride_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  
  expires_at TIMESTAMPTZ NOT NULL,
  usage_limit_per_user INT NOT NULL DEFAULT 1 CHECK (usage_limit_per_user > 0),
  total_usage_limit INT CHECK (total_usage_limit > 0),
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT percentage_discount_requires_max_amount
    CHECK ( (discount_type = 'FIXED_AMOUNT') OR (discount_type = 'PERCENTAGE' AND max_discount_amount IS NOT NULL) )
);

COMMENT ON TABLE public.vouchers IS 'Stores definitions for promotional vouchers and codes.';
COMMENT ON COLUMN public.vouchers.code IS 'The unique, user-facing code for the voucher.';
COMMENT ON COLUMN public.vouchers.max_discount_amount IS 'The maximum discount amount for percentage-based vouchers.';
COMMENT ON COLUMN public.vouchers.usage_limit_per_user IS 'How many times a single user can use this voucher type.';
COMMENT ON COLUMN public.vouchers.total_usage_limit IS 'The total number of times this voucher can be used across all users.';

-- Table: user_vouchers
-- Links users to vouchers they have been assigned or have claimed.
CREATE TABLE public.user_vouchers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  
  status public.user_voucher_status NOT NULL DEFAULT 'ACTIVE',
  
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  redeemed_at TIMESTAMPTZ,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL, -- Link to the ride where it was used
  
  UNIQUE(user_id, voucher_id) -- A user can have a specific voucher type only once.
);

COMMENT ON TABLE public.user_vouchers IS 'Tracks vouchers assigned to users and their redemption status.';
COMMENT ON COLUMN public.user_vouchers.ride_id IS 'The ride on which this voucher was redeemed.';

-- Table: referral_codes
-- Manages the referral program, linking codes to users.
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (char_length(code) > 5 AND char_length(code) < 15),
  usage_count INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.referral_codes IS 'Stores unique referral codes for each user.';

-- ---------------------------------------------------------------------------
-- 3. Add Indexes and Triggers
-- ---------------------------------------------------------------------------

-- Indexes for `vouchers`
CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_is_active_expires_at ON public.vouchers(is_active, expires_at);

-- Indexes for `user_vouchers`
CREATE INDEX idx_user_vouchers_user_id_status ON public.user_vouchers(user_id, status);

-- Indexes for `referral_codes`
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

-- Triggers for `updated_at`
CREATE TRIGGER handle_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- No updated_at for user_vouchers as it's more of a log. Status change is the main update.
CREATE TRIGGER handle_referral_codes_updated_at BEFORE UPDATE ON public.referral_codes FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. Define RLS Policies
-- ---------------------------------------------------------------------------

-- Policies for `vouchers`
DROP POLICY IF EXISTS "Authenticated users can view active vouchers" ON public.vouchers;
CREATE POLICY "Authenticated users can view active vouchers"
  ON public.vouchers FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > now());

-- Policies for `user_vouchers`
DROP POLICY IF EXISTS "Users can view their own vouchers" ON public.user_vouchers;
CREATE POLICY "Users can view their own vouchers"
  ON public.user_vouchers FOR SELECT
  TO authenticated
  USING (user_id = public.requesting_user_id());
  
-- Users should not be able to insert, update, or delete their vouchers directly.
-- This should be handled by backend logic (e.g., when a reward is granted).
DROP POLICY IF EXISTS "Disallow direct modification of user vouchers" ON public.user_vouchers;
CREATE POLICY "Disallow direct modification of user vouchers"
  ON public.user_vouchers FOR ALL
  USING (false);

-- Policies for `referral_codes`
DROP POLICY IF EXISTS "Users can view their own referral code" ON public.referral_codes;
CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (user_id = public.requesting_user_id());

-- Disallow direct modification of referral codes after creation.
DROP POLICY IF EXISTS "Disallow direct modification of referral codes" ON public.referral_codes;
CREATE POLICY "Disallow direct modification of referral codes"
  ON public.referral_codes FOR UPDATE
  USING (false);

-- Admin override policies
DROP POLICY IF EXISTS "Admins can manage all promotions data" ON public.vouchers;
CREATE POLICY "Admins can manage all promotions data" ON public.vouchers FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all promotions data" ON public.user_vouchers;
CREATE POLICY "Admins can manage all promotions data" ON public.user_vouchers FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all promotions data" ON public.referral_codes;
CREATE POLICY "Admins can manage all promotions data" ON public.referral_codes FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');
