-- Migration: Add email column to profiles table
-- Reason: queries were selecting profiles.email which didn't exist, causing 42703 errors
-- that bubbled up through SmartAdminQueryBuilder and crashed page re-renders.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users where possible
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
