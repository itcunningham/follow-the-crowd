-- PHASE 8: Remove dj_booking_contact_name from my_profile view
-- Run in Supabase SQL Editor AFTER:
--   1. The fallback-free code is deployed (getCurrentUserProfile reads private table only)
--   2. Backfill is complete and verified
--   3. Old column has been scrubbed to NULL
--
-- The owner-profile read path is now:
--   1. Public/owner fields from my_profile (WITHOUT dj_booking_contact_name)
--   2. Private contact field from direct user_private_data query
--
-- This removes the private column from the view, simplifying the security surface.
-- Preserves the original security configuration:
--   - security_invoker = false (definer-rights view)
--   - Explicit column enumeration (not select *)
--   - Owner-only WHERE clause
--   - Explicit REVOKE from public/anon
--   - Grant SELECT to authenticated only

BEGIN;

DROP VIEW IF EXISTS public.my_profile;

-- security_invoker = false: view runs with definer privileges, protecting the
-- owner-only filter and allowing read of the users table even if RLS becomes
-- more restrictive later.
CREATE VIEW public.my_profile
  WITH (security_invoker = false)
  AS
SELECT
  user_id,
  role,
  onboarding_complete,
  username,
  display_name,
  bio,
  genre,
  instagram_url,
  tiktok_url,
  soundcloud_url,
  website_url,
  location,
  avatar_url,
  artist_name,
  dj_availability,
  dj_past_gigs,
  promoter_brand_name,
  promoter_brand_description,
  promoter_venues_used,
  promoter_upcoming_events,
  promoter_past_events
FROM public.users
WHERE user_id = public.auth_user_id()::text;

-- Explicit permission hardening: revoke first, then grant
REVOKE ALL ON public.my_profile FROM public;
REVOKE ALL ON public.my_profile FROM anon;
GRANT SELECT ON public.my_profile TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
