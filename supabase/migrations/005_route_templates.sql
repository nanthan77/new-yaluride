-- supabase/migrations/005_route_templates.sql
-- This migration adds support for drivers to save and reuse common journey plans.

-- 1. Create the `route_templates` table
-- This table stores predefined routes that drivers can use as templates for new journeys.
CREATE TABLE public.route_templates (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    origin_address TEXT,
    origin_location GEOGRAPHY(POINT, 4326),
    destination_address TEXT,
    destination_location GEOGRAPHY(POINT, 4326),
    stops JSONB, -- Array of stop objects, e.g., [{"order": 1, "address": "Stop 1", "location": "POINT(lng lat)"}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT template_name_length_check CHECK (char_length(template_name) > 0 AND char_length(template_name) <= 100)
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.route_templates IS 'Stores reusable journey templates created by drivers.';
COMMENT ON COLUMN public.route_templates.id IS 'Unique identifier for the route template.';
COMMENT ON COLUMN public.route_templates.driver_id IS 'The driver who owns this template.';
COMMENT ON COLUMN public.route_templates.template_name IS 'A user-friendly name for the template (e.g., "Airport Drop-off").';
COMMENT ON COLUMN public.route_templates.origin_address IS 'The starting address of the template.';
COMMENT ON COLUMN public.route_templates.origin_location IS 'The geographic coordinates of the origin.';
COMMENT ON COLUMN public.route_templates.destination_address IS 'The final destination address of the template.';
COMMENT ON COLUMN public.route_templates.destination_location IS 'The geographic coordinates of the destination.';
COMMENT ON COLUMN public.route_templates.stops IS 'A JSONB array of intermediate stops, including order, address, and location.';
COMMENT ON COLUMN public.route_templates.created_at IS 'Timestamp of when the template was created.';
COMMENT ON COLUMN public.route_templates.updated_at IS 'Timestamp of when the template was last updated.';

-- 2. Add indexes for performance
-- Index on driver_id for quick lookup of a driver's templates.
CREATE INDEX idx_route_templates_driver_id ON public.route_templates(driver_id);

-- Spatial index for efficient location-based queries in the future.
CREATE INDEX idx_route_templates_origin_location ON public.route_templates USING GIST (origin_location);

-- Automatically update the `updated_at` timestamp on modification.
CREATE TRIGGER handle_route_templates_updated_at
BEFORE UPDATE ON public.route_templates
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');


-- 3. Enable Row Level Security (RLS)
-- This ensures that drivers can only access and manage their own templates.
ALTER TABLE public.route_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Policy: Drivers can perform all actions (SELECT, INSERT, UPDATE, DELETE) on their own route templates.
CREATE POLICY "Drivers can manage their own route templates"
ON public.route_templates
FOR ALL
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

-- Log the completion of the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 005_route_templates.sql completed successfully.';
END;
$$;
