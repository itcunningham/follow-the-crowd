-- Follow The Crowd — Test 001: Schema & ACL Checks
-- Verifies table structure, RLS enablement, function existence, and privilege grants.
-- LOCAL-ONLY: Run via `supabase test db`.
-- UNEXECUTED: Requires Docker/local Supabase.

BEGIN;

-- BOOTSTRAP: Include schema, RLS policies, and functions
-- NOTE: \ir is UNVERIFIED under `supabase test db`
-- If \ir fails, inline the contents of ../../test-support/security_bootstrap.sql here
\ir ../../test-support/security_bootstrap.sql

-- ============================================================================
-- TEST SUITE: Schema Parity & ACL
-- ============================================================================

SELECT plan(22);

-- Schema parity: Table existence
SELECT has_table('public'::name, 'conversations'::name, 'conversations table exists');
SELECT has_table('public'::name, 'conversation_members'::name, 'conversation_members table exists');
SELECT has_table('public'::name, 'messages'::name, 'messages table exists');
SELECT has_table('public'::name, 'message_reads'::name, 'message_reads table exists');
SELECT has_table('public'::name, 'events'::name, 'events table exists');
SELECT has_table('public'::name, 'booking_requests'::name, 'booking_requests table exists');

-- Column type check
SELECT col_type_is('public'::name, 'messages'::name, 'event_id'::name, 'text'::name, 'messages.event_id is text (production schema)');

-- RLS enablement
SELECT has_rls('public'::name, 'conversations'::name, 'RLS enabled on conversations table');

-- Function existence
SELECT has_function('public'::name, 'auth_user_id'::name, ARRAY[]::name[], 'auth_user_id() function exists');
SELECT has_function('public'::name, 'is_conversation_member'::name, ARRAY['uuid'::name], 'is_conversation_member(uuid) function exists');
SELECT has_function('public'::name, 'is_event_crew_member'::name, ARRAY['uuid'::name], 'is_event_crew_member(uuid) function exists');
SELECT has_function('public'::name, 'mark_conversation_unread'::name, ARRAY['text'::name, 'uuid'::name, 'uuid'::name], 'mark_conversation_unread(text, uuid, uuid) function exists');
SELECT has_function('public'::name, 'cancel_event'::name, ARRAY['uuid'::name], 'cancel_event(uuid) function exists');
SELECT has_function('public'::name, 'delete_empty_event'::name, ARRAY['uuid'::name], 'delete_empty_event(uuid) function exists');

-- ACL: mark_conversation_unread has NO EXECUTE for PUBLIC/anon/authenticated
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

-- ACL: cancel_event has NO EXECUTE for PUBLIC/anon; EXECUTE for authenticated
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

-- RLS policy existence
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
ROLLBACK;
