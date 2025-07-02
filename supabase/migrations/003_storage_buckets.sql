-- supabase/migrations/003_storage_buckets.sql
-- This script sets up the necessary storage buckets for YALURIDE and
-- defines the Row Level Security (RLS) policies to control access to files.

-- ---------------------------------------------------------------------------
-- 1. Create Storage Buckets
-- ---------------------------------------------------------------------------

-- Bucket for user profile pictures (publicly readable)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket for driver and vehicle verification documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification_documents', 'verification_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket for tour package images uploaded by drivers (publicly readable)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tour_images', 'tour_images', true)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. RLS Policies for `avatars` bucket
-- ---------------------------------------------------------------------------

-- Allow public read access to everyone
DROP POLICY IF EXISTS "Allow public read access on avatars" ON storage.objects;
CREATE POLICY "Allow public read access on avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Allow authenticated user to upload their own avatar" ON storage.objects;
CREATE POLICY "Allow authenticated user to upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Allow user to update their own avatar" ON storage.objects;
CREATE POLICY "Allow user to update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );

-- Allow users to delete their own avatar
DROP POLICY IF EXISTS "Allow user to delete their own avatar" ON storage.objects;
CREATE POLICY "Allow user to delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );


-- ---------------------------------------------------------------------------
-- 3. RLS Policies for `verification_documents` bucket (Private)
-- ---------------------------------------------------------------------------

-- Allow authenticated users to upload their own verification documents
DROP POLICY IF EXISTS "Allow user to upload their verification documents" ON storage.objects;
CREATE POLICY "Allow user to upload their verification documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification_documents' AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );

-- Allow admins to view all verification documents
DROP POLICY IF EXISTS "Allow admins to view all verification documents" ON storage.objects;
CREATE POLICY "Allow admins to view all verification documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification_documents' AND
    public.get_user_role(public.requesting_user_id()) = 'admin'
  );

-- Deny users from updating their own documents after upload to prevent tampering
-- Only admins can update (e.g., to add a watermark or status).
DROP POLICY IF EXISTS "Allow admins to update verification documents" ON storage.objects;
CREATE POLICY "Allow admins to update verification documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification_documents' AND
    public.get_user_role(public.requesting_user_id()) = 'admin'
  );

-- Only allow admins to delete verification documents
DROP POLICY IF EXISTS "Allow admins to delete verification documents" ON storage.objects;
CREATE POLICY "Allow admins to delete verification documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification_documents' AND
    public.get_user_role(public.requesting_user_id()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 4. RLS Policies for `tour_images` bucket
-- ---------------------------------------------------------------------------

-- Allow public read access to all tour images
DROP POLICY IF EXISTS "Allow public read access on tour images" ON storage.objects;
CREATE POLICY "Allow public read access on tour images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour_images');

-- Allow drivers to upload images into their own folder structure (e.g., {driver_id}/{tour_id}/image.jpg)
DROP POLICY IF EXISTS "Allow drivers to upload tour images" ON storage.objects;
CREATE POLICY "Allow drivers to upload tour images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tour_images' AND
    public.get_user_role(public.requesting_user_id()) IN ('driver', 'both') AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );

-- Allow drivers to update their own tour images
DROP POLICY IF EXISTS "Allow drivers to update their own tour images" ON storage.objects;
CREATE POLICY "Allow drivers to update their own tour images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tour_images' AND
    public.get_user_role(public.requesting_user_id()) IN ('driver', 'both') AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );

-- Allow drivers to delete their own tour images
DROP POLICY IF EXISTS "Allow drivers to delete their own tour images" ON storage.objects;
CREATE POLICY "Allow drivers to delete their own tour images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tour_images' AND
    public.get_user_role(public.requesting_user_id()) IN ('driver', 'both') AND
    (storage.foldername(name))[1] = public.requesting_user_id()::text
  );
