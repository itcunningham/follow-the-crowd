-- PHASE 7: Scrub sensitive fields from public.users
-- Run in Supabase SQL Editor AFTER:
--   1. Backfill is verified complete (scripts/verifyBackfillCompletion.sql shows zero mismatches)
--   2. Final code with no fallback is deployed (Phase 6)
--   3. Final code is verified to work correctly (Phase 6 smoke test)
--
-- Two fields that were treated as private are nulled out:
-- 1. dj_booking_contact_name — now stored only in user_private_data
-- 2. full_name — never written by any form and rendered nowhere;
--    left on public.users while broadly readable was a data-minimization miss
--
-- After this runs, both sensitive fields are NULL in the public table,
-- and the only owner-facing path to dj_booking_contact_name is user_private_data.

BEGIN;

-- Scrub both sensitive columns
UPDATE public.users
SET
  dj_booking_contact_name = NULL,
  full_name = NULL
WHERE (dj_booking_contact_name IS NOT NULL OR full_name IS NOT NULL)
  AND deleted_at IS NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verify scrub is complete: both sensitive columns must be entirely NULL
SELECT
  (SELECT COUNT(*) FROM public.users WHERE dj_booking_contact_name IS NOT NULL AND deleted_at IS NULL) as remaining_contact_names,
  (SELECT COUNT(*) FROM public.users WHERE full_name IS NOT NULL AND deleted_at IS NULL) as remaining_full_names;

-- Result must be: 0, 0
