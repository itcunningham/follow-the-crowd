-- PHASE A of 2 - ADDITIVE. Run this FIRST, before deploying the code.
--
-- Creates the owner-only view and nothing else. It deliberately does NOT
-- revoke anything, which is what makes it safe to run against the currently
-- deployed application: today's code still reads public.users directly and
-- keeps working, while the view simply exists unused until the new code ships.
--
-- Why the split matters. The two halves cannot run together:
--
--   * Run the revoke before the new code is live, and the deployed
--     owner-profile read - which still selects dj_booking_contact_name from
--     public.users - fails with 42501.
--   * Deploy the new code before this view exists, and every owner-profile
--     read fails with PGRST205 "Could not find the table 'public.my_profile'".
--     getCurrentUserProfile throws, and OnboardingGuard wraps the whole
--     authenticated app, so that is an app-wide outage.
--
-- Neither order works as one step. Add the new path first (this file), move
-- traffic onto it second (deploy), remove the old privilege last
-- (setupPrivateProfileFieldsRevoke.sql).
--
-- Rollback for this phase: drop view if exists public.my_profile;
--   Safe at any time BEFORE the code is deployed. After deployment, dropping
--   the view breaks the owner-profile read.

begin;

drop view if exists public.my_profile;

-- security_invoker = false so the view runs with its owner's privileges. That
-- matters in Phase C: once `authenticated` loses SELECT on
-- dj_booking_contact_name, only a definer-rights view can still read it for
-- the owner.
--
-- The WHERE clause is the whole guard. The view takes no parameters, so a
-- caller may add filters but every filter can only narrow an already-own-row
-- result - there is no way to point it at someone else. Setting
-- security_invoker = true later would break the owner's read rather than
-- expose anything: it fails closed.
--
-- Columns are enumerated, not `select *`. `select *` is expanded and frozen at
-- creation time anyway, so it costs the same maintenance while silently
-- exposing whatever column gets added later. This list is exactly
-- OWN_PROFILE_FIELDS in lib/user/currentUser.ts.
--
-- full_name is absent. It has zero runtime reads - written by no form,
-- rendered on no surface, referenced by no SQL - so exposing it here would
-- widen the blast radius for no caller.
create view public.my_profile
with (security_invoker = false) as
select
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
  promoter_past_events,
  dj_booking_contact_name
from public.users
where user_id = public.auth_user_id();

revoke all on public.my_profile from anon;
revoke all on public.my_profile from public;
grant select on public.my_profile to authenticated;

commit;

-- PostgREST caches the schema; without this the new view 404s with PGRST205.
notify pgrst, 'reload schema';

-- NEXT: verify the view exists and returns the caller's own row, THEN deploy
-- the code, THEN run scripts/setupPrivateProfileFieldsRevoke.sql.
