# P1 Private Profile Fields - Corrected 10-Phase Rollout

## Overview

This document describes the safe, verified rollout sequence for moving `dj_booking_contact_name` from the public `users` table to the private `user_private_data` table. The sequence preserves existing user data during the migration and avoids data loss or race conditions.

**Key invariants:**
- No downtime: users' profile edits work continuously
- No data loss: every existing contact name is preserved during transition
- No race condition: users who save after code deployment are not overwritten by backfill
- Safe to pause at any phase and roll back to the previous one

## Phases

### Phase 1: Create Private Table (QA Environment)

**Prerequisites:** Database access, setupPrivateProfileFieldsTable.sql

**Action:**
```sql
-- Run scripts/setupPrivateProfileFieldsTable.sql in Supabase SQL Editor
```

**Creates:**
- `public.user_private_data` table with RLS and explicit grants
- Owner-only SELECT, INSERT, UPDATE policies
- No DELETE privilege or policy (deletion via RPC only)

**Verification:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_private_data';

SELECT * FROM information_schema.role_table_grants 
WHERE table_name = 'user_private_data';
```

### Phase 2: Deploy Transitional Code (QA → Production)

**Prerequisites:** Phase 1 complete

**What changes:**

1. `lib/user/currentUser.ts::getCurrentUserProfile()` (READ PATH):
   - Query 1: Public fields from `my_profile` (includes `dj_booking_contact_name` temporarily)
   - Query 2: Private field from `user_private_data`
   - **Fallback:** If no private row exists, use the value from query 1 (old column)
   - **Key:** If a private row exists but is NULL, that NULL is authoritative (no fallback)

2. `lib/user/currentUser.ts::saveUserProfile()` (WRITE PATH):
   - Public fields → `users` table (via `.update()`)
   - Private field → `user_private_data` table (via `.upsert()`)
   - `dj_booking_contact_name` is NEVER written back to `users`

**Deploy:** Merge to main, deploy to production

**Smoke test:**
```
1. Sign in as QA user
2. Navigate to profile editor
3. Load profile (should show existing contact if it exists)
4. Edit a non-private field (e.g., display name)
5. Save → should succeed, profile cached
6. Reload profile → should still show old contact name (fallback active)
7. Edit contact name to a new value
8. Save → should write new value only to user_private_data
9. Reload profile → should show new value
```

**Rollback:** Revert code changes (read/write behavior goes back to single table)

### Phase 3: Backfill Old Values (Production Only)

**Prerequisites:**
- Phase 2 code is live and verified
- Minimum 1 hour of traffic to ensure early post-deployment issues are caught

**Action:**
```sql
-- Run scripts/backfillPrivateProfileFields.sql in Supabase SQL Editor
```

**What happens:**
```sql
INSERT INTO public.user_private_data (user_id, dj_booking_contact_name)
SELECT user_id, dj_booking_contact_name
FROM public.users
WHERE dj_booking_contact_name IS NOT NULL
  AND deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;
```

**Why `ON CONFLICT DO NOTHING`:**
If a user saved their profile between Phase 2 deployment and this backfill:
- Their `user_private_data` row already exists (from the save in Phase 2)
- The backfill INSERT would conflict
- `ON CONFLICT DO NOTHING` preserves their newer save, doesn't overwrite with the old `users` value

**Timing:**
- Safe to run any time after Phase 2, but best after enough time has passed that early production issues are surfaced
- Can be safely re-run if needed (idempotent)

### Phase 4: Verify Backfill Correspondence (Production)

**Prerequisites:** Phase 3 backfill completed

**Action:**
```sql
-- Run scripts/verifyBackfillCompletion.sql in Supabase SQL Editor
```

**What it checks:**
1. **Correspondence query:** For every user with a non-null old value, verify they have a private row with a value
   - Returns 0 rows if all users are correctly backfilled
   - Returns mismatches if any user's old value was not copied

2. **Summary counts:**
   - `users_with_old_value`: count of non-null values in `users.dj_booking_contact_name`
   - `private_rows_with_value`: count of non-null values in `user_private_data.dj_booking_contact_name`
   - `verified_pairs`: count of users with old AND matching private value
   - Should all be equal

**Success criteria:** Zero mismatches, all counts equal

**If mismatches found:**
- Do NOT proceed to Phase 5
- Investigate which users were missed
- Manually copy missing values if needed, OR
- Rollback Phase 3 and re-run with corrections

### Phase 5: Deploy Final Code (Remove Fallback)

**Prerequisites:**
- Phase 3 backfill verified complete (Phase 4 passed)
- Minimum monitoring period (e.g., 24 hours) since Phase 3

**What changes:**

1. `lib/user/currentUser.ts`:
   - `OWN_PROFILE_FIELDS` reverts to `PROFILE_FIELDS` (no `dj_booking_contact_name`)
   - `getCurrentUserProfile()` removes the fallback logic:
     - Query 1: Public fields from `my_profile` (does NOT include `dj_booking_contact_name`)
     - Query 2: Private field from `user_private_data`
     - No fallback: if no private row, use NULL

2. No changes to `saveUserProfile()`: still writes private field only to `user_private_data`

**Deploy:** Merge to main, deploy to production

**Smoke test:**
```
1. Sign in as QA user
2. Load profile → old column unavailable, shows value only from private table
3. Edit contact name
4. Save → writes only to user_private_data
5. Reload → still shows value
```

**Rollback:** Revert to Phase 4 code (re-activates fallback)

### Phase 6: Verify Final Code (Production)

**Prerequisites:** Phase 5 code deployed and live for 24+ hours

**Action:**
```
1. Monitor error logs for profile read/save failures
2. Spot-check Discover page loads (verifies profile reads work)
3. Spot-check settings → profile editor (verifies profile reads work)
4. Save a test change to a profile (verifies writes work)
5. Verify the test change persists (verifies the write path works)
```

**Success criteria:**
- No new errors in logs related to profile reads/saves
- Discover and profile pages load normally
- Profile edits and saves work as expected

### Phase 7: Scrub Old Columns (Production)

**Prerequisites:** Phase 6 verification passed

**Action:**
```sql
-- Run scripts/scrubPrivateProfileFieldsFromUsers.sql in Supabase SQL Editor
```

**What happens:**
```sql
UPDATE public.users
SET
  dj_booking_contact_name = NULL,
  full_name = NULL
WHERE (dj_booking_contact_name IS NOT NULL OR full_name IS NOT NULL)
  AND deleted_at IS NULL;
```

**Both columns are scrubbed:**
- `dj_booking_contact_name`: now only in `user_private_data`
- `full_name`: never had runtime usage, data-minimization cleanup

**Verification query returns:**
- `remaining_contact_names`: 0
- `remaining_full_names`: 0

**Success criteria:** Both zero

**If counts > 0:** Do NOT proceed. Investigate which users have non-null values and why.

### Phase 8: Clean Up my_profile View (Production)

**Prerequisites:**
- Phase 7 scrub verified complete
- Monitoring period since Phase 7 (e.g., 24 hours)

**Action:**
```sql
-- Run scripts/cleanupMyProfileView.sql in Supabase SQL Editor
```

**What changes:**
```sql
-- Recreate my_profile without dj_booking_contact_name, preserving security config
CREATE VIEW public.my_profile
  WITH (security_invoker = false)
  AS
SELECT
  user_id, role, onboarding_complete, username, display_name, bio, genre,
  instagram_url, tiktok_url, soundcloud_url, website_url, location,
  avatar_url, artist_name, dj_availability, dj_past_gigs,
  promoter_brand_name, promoter_brand_description, promoter_venues_used,
  promoter_upcoming_events, promoter_past_events
FROM public.users
WHERE user_id = public.auth_user_id()::text;

REVOKE ALL ON public.my_profile FROM public;
REVOKE ALL ON public.my_profile FROM anon;
GRANT SELECT ON public.my_profile TO authenticated;
```

**Preserves:**
- `security_invoker = false` (definer-rights)
- Explicit column enumeration (no `select *`)
- Owner-only WHERE clause
- Explicit REVOKE from public/anon
- GRANT to authenticated only

**Removes:**
- `dj_booking_contact_name` (now private-table-only)

**Smoke test:**
```
1. Load profile (uses my_profile for public fields, user_private_data for private field)
2. Edit and save profile
3. Reload profile → should work as before, now pulling private field from separate table
```

### Phase 9: Update Account Deletion RPC (Already Done)

**Prerequisites:** All phases complete

**Action:** Already deployed in Phase 2 (setupAccountDeletion.sql updated)

**Verification:** Account deletion includes:
```sql
if to_regclass('public.user_private_data') is not null then
  execute 'delete from public.user_private_data where user_id = $1'
  using v_user_id;
end if;
```

### Phase 10: Verify Final State

**Prerequisites:** All phases complete

**Action:**
```sql
-- Verify no sensitive data remains in public columns
SELECT COUNT(*) as exposed_contacts
FROM public.users
WHERE dj_booking_contact_name IS NOT NULL
  AND deleted_at IS NULL;

SELECT COUNT(*) as exposed_full_names
FROM public.users
WHERE full_name IS NOT NULL
  AND deleted_at IS NULL;

-- Verify private table is only readable by owner (RLS enforced)
-- This is verified by regression tests, not production SQL

-- Verify my_profile no longer exposes the private column
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'my_profile'
ORDER BY ordinal_position;
-- Should NOT include dj_booking_contact_name
```

**Success criteria:**
- `exposed_contacts` = 0
- `exposed_full_names` = 0
- `my_profile` columns do not include `dj_booking_contact_name`

---

## Rollback Plan

**During Phase 1-3:** Reverse the phase (no code rollback needed yet)

**During Phase 5 (final code):** Revert code to Phase 4 (re-activates fallback)

**After Phase 7 (scrub):** Cannot restore old values (they are NULL). Must use `UPDATE` to restore from backup if needed, or accept the scrub as permanent (by design).

**After Phase 8 (view cleanup):** Cannot restore old view definition. Must recreate `my_profile` with `dj_booking_contact_name` if needed (emergency only).

---

## Testing & Gates

All changes subject to:
1. **Regression tests** (test-regressions.mts)
   - Transitional fallback behavior verified
   - Field distribution verified
   - Private row wins over legacy value
   - Legacy fallback only when private row absent
   - Backfill uses ON CONFLICT DO NOTHING

2. **Mutation tests**
   - Private value never written to users
   - Cross-user access blocked by RLS
   - Owner read merges correctly
   - Account deletion removes private row

3. **CI gates**
   - Type checking
   - Lint rules
   - Unit tests
   - Integration tests
