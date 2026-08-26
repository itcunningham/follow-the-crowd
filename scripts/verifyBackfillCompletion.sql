-- PHASE 4: Verify backfill correspondence (not just counts)
-- Run in Supabase SQL Editor AFTER backfillPrivateProfileFields.sql
--
-- Ensures every active user with a non-null old contact value has a matching
-- private row with a value. Equal counts alone don't guarantee all users were
-- copied correctly - this verifies actual row-by-row correspondence.

-- Find any mismatches: users with old non-null values but no private row
SELECT
  u.user_id,
  u.dj_booking_contact_name as old_value,
  upd.dj_booking_contact_name as private_value,
  CASE
    WHEN upd.user_id IS NULL THEN 'MISSING: no private row'
    WHEN upd.dj_booking_contact_name IS NULL THEN 'MISMATCH: private row is NULL'
    ELSE 'OK'
  END as status
FROM public.users u
LEFT JOIN public.user_private_data upd ON u.user_id = upd.user_id
WHERE u.dj_booking_contact_name IS NOT NULL
  AND u.deleted_at IS NULL
  AND (upd.user_id IS NULL OR upd.dj_booking_contact_name IS NULL)
ORDER BY u.user_id;

-- Summary counts
SELECT
  (SELECT COUNT(*) FROM public.users WHERE dj_booking_contact_name IS NOT NULL AND deleted_at IS NULL) as users_with_old_value,
  (SELECT COUNT(*) FROM public.user_private_data WHERE dj_booking_contact_name IS NOT NULL) as private_rows_with_value,
  (SELECT COUNT(*) FROM public.users u
   WHERE u.dj_booking_contact_name IS NOT NULL
     AND u.deleted_at IS NULL
     AND EXISTS (SELECT 1 FROM public.user_private_data upd WHERE upd.user_id = u.user_id AND upd.dj_booking_contact_name IS NOT NULL)) as verified_pairs;

-- Result must be: zero rows in the first query (all rows matched).
-- Summary counts should show users_with_old_value = verified_pairs.
