-- supabase/migrations/008_gamification_features.sql
-- This migration adds the necessary tables, functions, and policies for the YALURIDE Gamification feature.

-- ---------------------------------------------------------------------------
-- 1. Modify Existing Tables
-- ---------------------------------------------------------------------------

-- Add a points balance to the user profiles table.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0 CHECK (points_balance >= 0);

COMMENT ON COLUMN public.profiles.points_balance IS 'The current total of redeemable points for the user.';

-- ---------------------------------------------------------------------------
-- 2. Create New Tables
-- ---------------------------------------------------------------------------

-- Table: badges
-- Defines all available badges, their criteria, and rewards.
CREATE TABLE public.badges (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT, -- URL or identifier for the badge icon
  criteria JSONB NOT NULL, -- e.g., {"type": "ride_count", "value": 100} or {"type": "rating_streak", "value": 5, "min_rating": 4.9}
  points_reward INT NOT NULL DEFAULT 0 CHECK (points_reward >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.badges IS 'Stores definitions for all achievable badges in the system.';
COMMENT ON COLUMN public.badges.criteria IS 'The rules required to earn this badge, stored in a flexible JSON format.';
COMMENT ON COLUMN public.badges.points_reward IS 'Number of points awarded to the user when this badge is earned.';

-- Table: user_badges
-- A junction table to track which users have earned which badges.
CREATE TABLE public.user_badges (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id BIGINT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- A user can only earn each type of badge once.
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

COMMENT ON TABLE public.user_badges IS 'Tracks which badges have been earned by which users.';

-- Table: points_log
-- A ledger of all point transactions for auditing and history.
CREATE TABLE public.points_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_awarded INT NOT NULL,
  reason TEXT NOT NULL, -- e.g., 'RIDE_COMPLETION', 'BADGE_AWARDED', 'VOUCHER_REDEMPTION'
  related_event_id TEXT, -- Can store a ride_id, user_badge_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.points_log IS 'Logs every point transaction for a user for auditing purposes.';
COMMENT ON COLUMN public.points_log.points_awarded IS 'Can be positive for earnings or negative for redemptions.';
COMMENT ON COLUMN public.points_log.related_event_id IS 'An optional ID linking to the source event (e.g., ride ID).';

-- ---------------------------------------------------------------------------
-- 3. Add Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX idx_points_log_user_id ON public.points_log(user_id);

-- ---------------------------------------------------------------------------
-- 4. Create Functions and Triggers
-- ---------------------------------------------------------------------------

-- Function to update the user's points balance automatically.
CREATE OR REPLACE FUNCTION public.update_user_points_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET points_balance = points_balance + NEW.points_awarded
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new entry in points_log.
CREATE TRIGGER on_points_log_insert
AFTER INSERT ON public.points_log
FOR EACH ROW
EXECUTE FUNCTION public.update_user_points_balance();

-- ---------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. Define RLS Policies
-- ---------------------------------------------------------------------------

-- Policies for `badges`
DROP POLICY IF EXISTS "Authenticated users can view available badges" ON public.badges;
CREATE POLICY "Authenticated users can view available badges"
  ON public.badges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policies for `user_badges`
DROP POLICY IF EXISTS "Users can view their own earned badges" ON public.user_badges;
CREATE POLICY "Users can view their own earned badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (user_id = public.requesting_user_id());

-- Policies for `points_log`
DROP POLICY IF EXISTS "Users can view their own points history" ON public.points_log;
CREATE POLICY "Users can view their own points history"
  ON public.points_log FOR SELECT
  TO authenticated
  USING (user_id = public.requesting_user_id());

-- Admin override policies for management
DROP POLICY IF EXISTS "Admins can manage all gamification data" ON public.badges;
CREATE POLICY "Admins can manage all gamification data" ON public.badges FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all gamification data" ON public.user_badges;
CREATE POLICY "Admins can manage all gamification data" ON public.user_badges FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all gamification data" ON public.points_log;
CREATE POLICY "Admins can manage all gamification data" ON public.points_log FOR ALL
  USING (public.get_user_role(public.requesting_user_id()) = 'admin');
