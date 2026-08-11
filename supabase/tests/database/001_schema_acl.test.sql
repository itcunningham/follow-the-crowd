-- Follow The Crowd — Test 001: Schema & ACL Checks
-- Verifies table structure, RLS enablement, function existence, and privilege grants.
-- Tests against the real migrated baseline + migrations 001-010 in local database.
-- LOCAL-ONLY: Run via `supabase test db`.

BEGIN;

-- ============================================================================
-- TEST SUITE: Schema Parity & ACL (26 assertions)
-- Tests against real migrated schema (baseline + migrations 001-010).
-- ============================================================================

SELECT plan(26);

-- Schema parity: Table existence
SELECT has_table('public'::name, 'conversations'::name, 'conversations table exists');
SELECT has_table('public'::name, 'conversation_members'::name, 'conversation_members table exists');
SELECT has_table('public'::name, 'messages'::name, 'messages table exists');
SELECT has_table('public'::name, 'message_reads'::name, 'message_reads table exists');
SELECT has_table('public'::name, 'events'::name, 'events table exists');
SELECT has_table('public'::name, 'booking_requests'::name, 'booking_requests table exists');

-- Column type check (pg_attribute catalog)
SELECT is(
  (SELECT atttypid::regtype::text FROM pg_attribute
   WHERE attrelid = 'public.messages'::regclass AND attname = 'event_id'),
  'uuid'::text,
  'messages.event_id is uuid (post-migration schema)'
);

-- Verify messages.body column exists (real column name, not test fixture "text")
SELECT has_column(
  'public'::name,
  'messages'::name,
  'body'::name,
  'messages.body column exists'
);

-- RLS enablement (pg_class.relrowsecurity catalog)
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'conversations' AND relnamespace = 'public'::regnamespace),
  true,
  'RLS enabled on conversations table'
);

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

-- RLS policy existence on conversations
SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations' AND schemaname = 'public'),
  1::bigint,
  'At least one RLS policy exists on conversations table'
);

-- RLS policy existence on messages: Assert required policy NAMES, not exact count
-- (Count varies as migrations add policies; we verify the minimum required set exists)
SELECT has_policy(
  'public'::name,
  'messages'::name,
  'messages_select_conversation_member'::name,
  'Policy messages_select_conversation_member exists (DM select)'
);

SELECT has_policy(
  'public'::name,
  'messages'::name,
  'messages_insert_conversation_sender'::name,
  'Policy messages_insert_conversation_sender exists (DM insert)'
);

SELECT has_policy(
  'public'::name,
  'messages'::name,
  'messages_select_event_authenticated'::name,
  'Policy messages_select_event_authenticated exists (event crew select)'
);

SELECT has_policy(
  'public'::name,
  'messages'::name,
  'messages_insert_event_sender'::name,
  'Policy messages_insert_event_sender exists (event crew insert)'
);

SELECT finish();
ROLLBACK;
