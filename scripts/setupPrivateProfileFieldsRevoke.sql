-- PHASE C of 2 - RESTRICTIVE. Run this LAST.
--
-- PREREQUISITES, both of them:
--   1. scripts/setupPrivateProfileFieldsView.sql has been run and
--      public.my_profile exists.
--   2. The code that reads the owner's profile from `my_profile` is DEPLOYED
--      and verified in production.
--
-- Running this before the code is live breaks the deployed owner-profile read
-- with 42501, because it still selects dj_booking_contact_name from
-- public.users. This is the step that removes the old privilege, so it goes
-- after traffic has moved, never before.
--
-- This is the file that actually closes the hole. Until it runs, the private
-- columns are still readable by any signed-in user with a direct query -
-- Phase A alone changes nothing about access.
--
-- Why table privileges rather than RLS: users_select_authenticated is
-- `using (auth.uid() is not null)`, and RLS has no column granularity, so no
-- policy can express "these two columns are yours alone". Table privileges are
-- checked per column AND before RLS, so a revoked column is denied in every
-- query shape - projection, WHERE, ORDER BY, select=* - with 42501, leaving no
-- filterable oracle behind.
--
-- Rollback:
--   begin;
--   revoke select on table public.users from authenticated;
--   grant select on table public.users to authenticated;
--   commit;
--   notify pgrst, 'reload schema';
--   (Restores the pre-change state, including the exposure. The view can stay;
--   it is harmless and the deployed code needs it.)

begin;

-- A single column cannot be revoked out of a table-level grant, so the
-- table-level SELECT goes and the allowed columns are granted back by name.
revoke select on table public.users from authenticated;

-- The 21 columns of PROFILE_FIELDS, plus deleted_at.
--
-- deleted_at is NOT projected by any query, but currentUser.ts and
-- plannerDjRoster.ts both filter on it with `.is("deleted_at", null)`, and
-- PostgREST needs SELECT on a column to filter by it. Omitting it breaks
-- Discover and the DJ roster with 42501 - the realistic way this change fails
-- in production.
--
-- Deliberately absent: full_name and dj_booking_contact_name.
--
-- NOTE: a column added to public.users later is NOT readable until it is added
-- here. That default is intentional - a new field is private until someone
-- decides otherwise - but it does mean a new public field looks like a bug
-- until it is granted.
grant select (
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
  deleted_at
) on table public.users to authenticated;

-- INSERT and UPDATE are deliberately untouched. They stay table-level, so the
-- owner's profile save still writes dj_booking_contact_name, and
-- users_update_own still confines it to their own row. Restricting UPDATE
-- would break profile editing and buy nothing: RLS already stops one user
-- writing another's row.

commit;

notify pgrst, 'reload schema';

-- NEXT: smoke Discover, the DJ roster, another user's profile, and the owner's
-- own profile edit. Then scripts/verifyPrivateProfileFields.sql.
