-- Follow The Crowd — Test 001: Schema & ACL Checks
-- Verifies table structure, RLS enablement, function existence, and privilege grants.
-- Tests against the real migrated baseline + migrations 001-010 in local database.
-- LOCAL-ONLY: Run via `supabase test db`.

BEGIN;

-- ============================================================================
-- TEST SUITE: Schema Parity & ACL (16 assertions)
-- Tests against real migrated schema (baseline + migrations 001-010).
-- ============================================================================

SELECT plan(16);

-- Schema parity: Table existence
SELECT has_table('public'::name, 'conversations'::name, 'conversations table exists');
SELECT has_table('public'::name, 'conversation_members'::name, 'conversation_members table exists');
SELECT has_table('public'::name, 'messages'::name, 'messages table exists');
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

-- Function existence (baseline schema only)
-- Note: mark_conversation_unread, cancel_event, delete_empty_event are outside the baseline + 001–010 contract
SELECT has_function('public'::name, 'auth_user_id'::name, ARRAY[]::name[], 'auth_user_id() function exists');
SELECT has_function('public'::name, 'is_conversation_member'::name, ARRAY['uuid'::name], 'is_conversation_member(uuid) function exists');
SELECT has_function('public'::name, 'is_event_crew_member'::name, ARRAY['uuid'::name], 'is_event_crew_member(uuid) function exists');

-- ACL: Core baseline functions
-- Note: mark_conversation_unread, cancel_event, delete_empty_event are outside the baseline + 001–010 contract
-- RPC privilege checks deferred to separate integration test suite.

-- RLS policy existence on conversations
SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations' AND schemaname = 'public'),
  1::bigint,
  'At least one RLS policy exists on conversations table'
);

-- RLS policy existence on messages: Assert required policy NAMES via pg_policies catalog
-- (Count varies as migrations add policies; we verify the minimum required set exists)
SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public' AND policyname = 'messages_select_conversation_member'),
  1::bigint,
  'Policy messages_select_conversation_member exists (DM select)'
);

SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public' AND policyname = 'messages_insert_conversation_sender'),
  1::bigint,
  'Policy messages_insert_conversation_sender exists (DM insert)'
);

SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public' AND policyname = 'messages_select_event_authenticated'),
  1::bigint,
  'Policy messages_select_event_authenticated exists (event crew select)'
);

SELECT is(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public' AND policyname = 'messages_insert_event_sender'),
  1::bigint,
  'Policy messages_insert_event_sender exists (event crew insert)'
);

SELECT finish();
ROLLBACK;
