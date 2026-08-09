-- PHASE 3: Backfill user_private_data from public.users
-- Run in Supabase SQL Editor AFTER the dual-write code is live.
-- This copy must happen while the new code is writing to both tables,
-- to avoid duplicates and race conditions.

BEGIN;

-- Backfill dj_booking_contact_name from public.users
-- Only for non-deleted users who have a value.
INSERT INTO public.user_private_data (user_id, dj_booking_contact_name)
SELECT user_id, dj_booking_contact_name
FROM public.users
WHERE dj_booking_contact_name IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify backfill completed
SELECT
  (SELECT COUNT(*) FROM public.user_private_data) as private_table_rows,
  (SELECT COUNT(*) FROM public.users WHERE dj_booking_contact_name IS NOT NULL AND deleted_at IS NULL) as users_with_value;

COMMIT;

NOTIFY pgrst, 'reload schema';
