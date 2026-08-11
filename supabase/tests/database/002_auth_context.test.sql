-- Follow The Crowd — Test 002: Auth Context Proof
-- Verifies that request.jwt.claims correctly drives auth.uid() identity.
-- Tests against the real migrated baseline + migrations 001-010 in local database.
-- LOCAL-ONLY: Run via `supabase test db`.

BEGIN;

-- ============================================================================
-- TEST SUITE: Auth Context Proof (3 assertions)
-- ============================================================================

SELECT plan(3);

-- Proof 1: anon role → auth.uid() is NULL
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT is(
  public.auth_user_id(),
  NULL,
  'anon role returns NULL from auth.uid()'
);

-- Proof 2: authenticated user A → auth.uid() = user A UUID
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT is(
  public.auth_user_id(),
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text,
  'authenticated user A returns correct UUID from auth.uid()'
);

-- Proof 3: authenticated user B → auth.uid() = user B UUID
SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","role":"authenticated","aud":"authenticated"}';

SELECT is(
  public.auth_user_id(),
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text,
  'authenticated user B returns correct UUID from auth.uid()'
);

SELECT finish();
ROLLBACK;
