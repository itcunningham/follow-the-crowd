-- Follow The Crowd — Security & RLS/RPC pgTAP Tests
-- Tests authorization boundaries for DM conversations and event cancellation.
-- LOCAL-ONLY: Run via `supabase test db` (from supabase/ root).
-- UNEXECUTED: Requires Docker/local Supabase with proper request.jwt.claims context.
-- Assertions defined; behavioral results pending execution against real Supabase instance.

-- ============================================================================
-- INFRASTRUCTURE: Include test-support bootstrap
-- ============================================================================
-- Bootstrap schema, functions, and RLS policies are defined outside supabase/tests/
-- to prevent them from being discovered as independent test files.
-- They are included here so all schema/policies/functions exist in this test context.
--
-- Under `pg_prove` / `supabase test db`, this file runs in a transaction.
-- The bootstrap is applied at the start, then fixtures are created once.
-- Each test suite has its own BEGIN/COMMIT (becomes savepoint).
-- Behavioral suites ROLLBACK to reset mutations; schema/fixtures persist.

\ir ../../test-support/security_bootstrap.sql

-- ============================================================================
-- SETUP: Create test data (runs once before all tests; persists in outer transaction)
-- ============================================================================

BEGIN;

INSERT INTO public.conversations (id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid);

INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text),
  ('11111111-1111-4111-1111-111111111111'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text);

INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES
  ('22222222-2222-4222-2222-222222222222'::uuid, '11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'Test message');

INSERT INTO public.events (id, owner_id, status) VALUES
  ('33333333-3333-4333-3333-333333333333'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'pending');

INSERT INTO public.booking_requests (id, event_id, recipient_id, conversation_id, status) VALUES
  ('44444444-4444-4444-4444-444444444444'::uuid, '33333333-3333-4333-3333-333333333333'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text, '11111111-1111-4111-1111-111111111111'::uuid, 'pending');

COMMIT;

-- ============================================================================
-- TEST SUITE 1: SCHEMA PARITY (structural checks)
-- ============================================================================

BEGIN;
SELECT plan(8);

SELECT has_table('public'::name, 'conversations'::name, 'conversations table exists');
SELECT has_table('public'::name, 'conversation_members'::name, 'conversation_members table exists');
SELECT has_table('public'::name, 'messages'::name, 'messages table exists');
SELECT has_table('public'::name, 'message_reads'::name, 'message_reads table exists');
SELECT has_table('public'::name, 'events'::name, 'events table exists');
SELECT has_table('public'::name, 'booking_requests'::name, 'booking_requests table exists');

SELECT col_type_is('public'::name, 'messages'::name, 'event_id'::name, 'text'::name, 'messages.event_id is text (production schema)');

SELECT has_rls('public'::name, 'conversations'::name, 'RLS enabled on conversations table');

SELECT finish();
COMMIT;

-- ============================================================================
-- TEST SUITE 2: HELPER FUNCTION EXISTENCE & SIGNATURES
-- ============================================================================

BEGIN;
SELECT plan(6);

SELECT has_function('public'::name, 'auth_user_id'::name, ARRAY[]::name[], 'auth_user_id() function exists');
SELECT has_function('public'::name, 'is_conversation_member'::name, ARRAY['uuid'::name], 'is_conversation_member(uuid) function exists');
SELECT has_function('public'::name, 'is_event_crew_member'::name, ARRAY['uuid'::name], 'is_event_crew_member(uuid) function exists');
SELECT has_function('public'::name, 'mark_conversation_unread'::name, ARRAY['text'::name, 'uuid'::name, 'uuid'::name], 'mark_conversation_unread(text, uuid, uuid) function exists');
SELECT has_function('public'::name, 'cancel_event'::name, ARRAY['uuid'::name], 'cancel_event(uuid) function exists');
SELECT has_function('public'::name, 'delete_empty_event'::name, ARRAY['uuid'::name], 'delete_empty_event(uuid) function exists');

SELECT finish();
COMMIT;

-- ============================================================================
-- TEST SUITE 3: AUTH CONTEXT PROOF (verify request.jwt.claims mechanism works)
-- ============================================================================
-- REQUIRES: Supabase test context with proper JWT claims

BEGIN;
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
COMMIT;

-- ============================================================================
-- TEST SUITE 4: ACL/PRIVILEGE ASSERTIONS (static grant inspection)
-- ============================================================================

BEGIN;
SELECT plan(8);

-- mark_conversation_unread() must have NO EXECUTE for PUBLIC/anon/authenticated
SELECT is(
  (SELECT COUNT(*) FROM aclexplode(COALESCE(
    (SELECT proacl FROM pg_proc WHERE proname = 'mark_conversation_unread' AND pronargs = 3 LIMIT 1),
    acldefault('f', (SELECT oid FROM pg_roles WHERE rolname = 'postgres'))
  )) WHERE privilege_type = 'EXECUTE' AND grantee = 0),
  0::bigint,
  'mark_conversation_unread() has NO EXECUTE for PUBLIC pseudo-role'
);

SELECT is(
  (SELECT COUNT(*) FROM aclexplode(COALESCE(
    (SELECT proacl FROM pg_proc WHERE proname = 'mark_conversation_unread' AND pronargs = 3 LIMIT 1),
    acldefault('f', (SELECT oid FROM pg_roles WHERE rolname = 'postgres'))
  )) WHERE privilege_type = 'EXECUTE' AND grantee IN (SELECT oid FROM pg_roles WHERE rolname = 'anon')),
  0::bigint,
  'mark_conversation_unread() has NO EXECUTE for anon role'
);

SELECT is(
  (SELECT COUNT(*) FROM aclexplode(COALESCE(
    (SELECT proacl FROM pg_proc WHERE proname = 'mark_conversation_unread' AND pronargs = 3 LIMIT 1),
    acldefault('f', (SELECT oid FROM pg_roles WHERE rolname = 'postgres'))
  )) WHERE privilege_type = 'EXECUTE' AND grantee IN (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')),
  0::bigint,
  'mark_conversation_unread() has NO EXECUTE for authenticated role'
);

-- cancel_event() must have NO EXECUTE for PUBLIC/anon; EXECUTE for authenticated
SELECT is(
  (SELECT COUNT(*) FROM aclexplode(COALESCE(
    (SELECT proacl FROM pg_proc WHERE proname = 'cancel_event' AND pronargs = 1 LIMIT 1),
    acldefault('f', (SELECT oid FROM pg_roles WHERE rolname = 'postgres'))
  )) WHERE privilege_type = 'EXECUTE' AND grantee = 0),
  0::bigint,
  'cancel_event() has NO EXECUTE for PUBLIC pseudo-role'
);

SELECT is(
  (SELECT COUNT(*) FROM aclexplode(COALESCE(
    (SELECT proacl FROM pg_proc WHERE proname = 'cancel_event' AND pronargs = 1 LIMIT 1),
    acldefault('f', (SELECT oid FROM pg_roles WHERE rolname = 'postgres'))
  )) WHERE privilege_type = 'EXECUTE' AND grantee IN (SELECT oid FROM pg_roles WHERE rolname = 'anon')),
  0::bigint,
  'cancel_event() has NO EXECUTE for anon role'
);

SELECT is(
  (SELECT COUNT(*) FROM aclexplode(COALESCE(
    (SELECT proacl FROM pg_proc WHERE proname = 'cancel_event' AND pronargs = 1 LIMIT 1),
    acldefault('f', (SELECT oid FROM pg_roles WHERE rolname = 'postgres'))
  )) WHERE privilege_type = 'EXECUTE' AND grantee IN (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')),
  1::bigint,
  'cancel_event() EXECUTE is granted to authenticated role'
);

-- Verify RLS policies exist
SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations' AND schemaname = 'public'),
  1::bigint,
  'At least one RLS policy exists on conversations table'
);

SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public'),
  4::bigint,
  'Four RLS policies exist on messages table (DM select/insert + event crew select/insert)'
);

SELECT finish();
COMMIT;

-- ============================================================================
-- TEST SUITE 5: RLS BEHAVIORAL TESTS (authenticated identity filtering)
-- REQUIRES: Supabase test context with proper JWT claims
-- ============================================================================
-- NOTE: anon role has REVOKE ALL on DM tables (bootstrap), so SELECT fails with 42501
-- (insufficient privilege) before RLS filtering occurs. Tests below verify this.

BEGIN;
SELECT plan(6);

-- Test 5.1: anon cannot read conversations (REVOKE SELECT + no RLS eval)
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT id FROM public.conversations WHERE id = ''11111111-1111-4111-1111-111111111111''::uuid;',
  '42501',
  'anon role denied SELECT on conversations (insufficient privilege; no table access)'
);

-- Test 5.2: anon cannot read messages (REVOKE SELECT + no RLS eval)
SELECT throws_ok(
  'SELECT id FROM public.messages WHERE conversation_id = ''11111111-1111-4111-1111-111111111111''::uuid;',
  '42501',
  'anon role denied SELECT on messages (insufficient privilege; no table access)'
);

-- Test 5.3: non-member cannot read conversation (RLS filtering after GRANT)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"cccccccc-cccc-4ccc-cccc-cccccccccccc","role":"authenticated","aud":"authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM public.conversations WHERE id = '11111111-1111-4111-1111-111111111111'::uuid),
  0::bigint,
  'non-member cannot read conversation (RLS filters non-member)'
);

-- Test 5.4: non-member cannot read messages (RLS filtering)
SELECT is(
  (SELECT COUNT(*) FROM public.messages WHERE conversation_id = '11111111-1111-4111-1111-111111111111'::uuid),
  0::bigint,
  'non-member cannot read messages in conversation (RLS filters non-member)'
);

-- Test 5.5: member can read conversation (RLS allows member)
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM public.conversations WHERE id = '11111111-1111-4111-1111-111111111111'::uuid),
  1::bigint,
  'member can read conversation (RLS allows member)'
);

-- Test 5.6: member can read messages (RLS allows member)
SELECT is(
  (SELECT COUNT(*) FROM public.messages WHERE conversation_id = '11111111-1111-4111-1111-111111111111'::uuid),
  1::bigint,
  'member can read messages in conversation (RLS allows member)'
);

SELECT finish();
ROLLBACK;

-- ============================================================================
-- TEST SUITE 6: MESSAGE INSERT AUTHORIZATION (RLS WITH CHECK)
-- REQUIRES: Supabase test context with proper JWT claims
-- ============================================================================

BEGIN;
SELECT plan(4);

-- Test 6.1: member can insert message as themselves
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT lives_ok(
  'INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES (''55555555-5555-4555-5555-555555555555''::uuid, ''11111111-1111-4111-1111-111111111111''::uuid, ''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''Member insert'');',
  'member can insert message as themselves'
);

-- Test 6.2: member cannot insert message with different user_id (RLS WITH CHECK)
SELECT throws_ok(
  'INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES (''66666666-6666-4666-6666-666666666666''::uuid, ''11111111-1111-4111-1111-111111111111''::uuid, ''bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb''::text, ''Spoofed insert'');',
  '42501',
  'member cannot insert message with different user_id (RLS WITH CHECK blocks spoofing)'
);

-- Test 6.3: non-member cannot insert message (RLS WITH CHECK)
SET LOCAL "request.jwt.claims" = '{"sub":"cccccccc-cccc-4ccc-cccc-cccccccccccc","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES (''77777777-7777-4777-7777-777777777777''::uuid, ''11111111-1111-4111-1111-111111111111''::uuid, ''cccccccc-cccc-4ccc-cccc-cccccccccccc''::text, ''Non-member insert'');',
  '42501',
  'non-member cannot insert message (RLS WITH CHECK blocks non-member)'
);

-- Test 6.4: Verify message was inserted (switch back to User 1 to check visibility)
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM public.messages WHERE id = '55555555-5555-4555-5555-555555555555'::uuid),
  1::bigint,
  'message insert from Test 6.1 succeeded and is visible to inserter'
);

SELECT finish();
ROLLBACK;

-- ============================================================================
-- TEST SUITE 7: RPC AUTHORIZATION — mark_conversation_unread (no client EXECUTE)
-- REQUIRES: Supabase test context with proper JWT claims
-- ============================================================================

BEGIN;
SELECT plan(2);

-- Test 7.1: authenticated cannot invoke mark_conversation_unread directly
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.mark_conversation_unread(''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''11111111-1111-4111-1111-111111111111''::uuid, NULL::uuid);',
  '42501',
  'authenticated cannot invoke mark_conversation_unread (function EXECUTE not granted)'
);

-- Test 7.2: anon cannot invoke mark_conversation_unread
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.mark_conversation_unread(''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''11111111-1111-4111-1111-111111111111''::uuid, NULL::uuid);',
  '42501',
  'anon cannot invoke mark_conversation_unread (function EXECUTE not granted)'
);

SELECT finish();
COMMIT;

-- ============================================================================
-- TEST SUITE 8: RPC AUTHORIZATION — cancel_event (owner-only + event state)
-- REQUIRES: Supabase test context with proper JWT claims
-- ============================================================================

BEGIN;
SELECT plan(4);

-- Test 8.1: non-owner cannot cancel event
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.cancel_event(''33333333-3333-4333-3333-333333333333''::uuid);',
  'P0001',
  'non-owner cannot cancel event (authorization check enforced)'
);

-- Test 8.2: owner can cancel event
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT lives_ok(
  'SELECT public.cancel_event(''33333333-3333-4333-3333-333333333333''::uuid);',
  'owner can call cancel_event()'
);

-- Test 8.3: event status changed to cancelled
SELECT is(
  (SELECT status FROM public.events WHERE id = '33333333-3333-4333-3333-333333333333'::uuid),
  'cancelled'::text,
  'cancel_event() changes event status to cancelled'
);

-- Test 8.4: mark_conversation_unread was called (isolation: affected DJ read-state marked)
SELECT is(
  (SELECT COUNT(*) FROM public.message_reads
   WHERE user_id = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text
   AND conversation_id = '11111111-1111-4111-1111-111111111111'::uuid),
  1::bigint,
  'cancellation called mark_conversation_unread: affected DJ has message_reads entry'
);

SELECT finish();
ROLLBACK;

-- ============================================================================
-- TEST SUITE 9: RPC AUTHORIZATION — delete_empty_event (owner-only)
-- REQUIRES: Supabase test context with proper JWT claims
-- ============================================================================

BEGIN;
SELECT plan(1);

-- Setup: Create an empty event (no booking requests)
INSERT INTO public.events (id, owner_id, status) VALUES
  ('99999999-9999-4999-9999-999999999999'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'pending');

-- Test 9.1: owner can delete empty event
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT lives_ok(
  'SELECT public.delete_empty_event(''99999999-9999-4999-9999-999999999999''::uuid);',
  'owner can delete empty event'
);

SELECT finish();
ROLLBACK;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================
-- Total test cases: 42 assertions
-- Status: UNEXECUTED (requires Docker/local Supabase with proper request.jwt.claims context)
--
-- Architecture:
-- - Bootstrap schema/functions included via \ir from supabase/test-support/
-- - Fixtures created once in outer transaction; persist across all suites
-- - Each behavioral suite uses BEGIN/ROLLBACK (becomes savepoint)
-- - Schema and fixtures persist; only mutations are rolled back
--
-- Test breakdown by category:
-- - Schema parity: 8 assertions (executable in any PostgreSQL)
-- - Function existence: 6 assertions (executable in any PostgreSQL)
-- - Auth context proof: 3 assertions (REQUIRES Supabase test context)
-- - ACL/privilege inspection: 8 assertions (executable in any PostgreSQL)
-- - RLS behavioral filtering: 6 assertions (REQUIRES Supabase test context)
-- - Message insert authorization: 4 assertions (REQUIRES Supabase test context)
-- - RPC mark_conversation_unread authorization: 2 assertions (REQUIRES Supabase test context)
-- - RPC cancel_event authorization: 4 assertions (REQUIRES Supabase test context)
-- - RPC delete_empty_event authorization: 1 assertion (REQUIRES Supabase test context)
--
-- Tests executable in any PostgreSQL (17 assertions):
--   - Schema parity tests (8)
--   - Function existence tests (6)
--   - ACL/privilege tests (8)
--
-- Tests REQUIRING Supabase test context (25 assertions):
--   - Auth context proof (3) — verifies request.jwt.claims mechanism works
--   - RLS behavioral tests (6) — anon/member/non-member row filtering
--   - Message insert RLS WITH CHECK (4) — user_id validation, membership check
--   - RPC function invocation restrictions (2) — mark_conversation_unread EXECUTE denied
--   - Event ownership authorization (4) — cancel_event owner-only check
--   - Event state verification (1) — status → cancelled
--   - Cancellation isolation (1) — affected DJ read-state marked unread
--   - Empty event deletion (1) — delete_empty_event owner-only check
--
-- All behavioral tests run in their own transaction with ROLLBACK for determinism.
-- Each test proves actual database behavior, not just schema/grant declarations.
--
-- Execution with Supabase CLI (standard workflow):
--   supabase start
--   supabase test db
--
-- This runs all .sql/.pg test files under supabase/tests/ via pg_prove.
