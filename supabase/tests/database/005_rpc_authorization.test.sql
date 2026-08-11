-- Follow The Crowd — Test 005: RPC Authorization
-- Verifies RPC function access control and event ownership/state behavior.
-- Tests against the real migrated baseline + migrations 001-010 in local database.
-- LOCAL-ONLY: Run via `supabase test db`.

BEGIN;

-- ============================================================================
-- FIXTURES: Test data (event + DM conversation for cancellation flow)
-- (Inserted with postgres superuser privileges before role switching)
-- ============================================================================

INSERT INTO public.conversations (id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid);

INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text),
  ('11111111-1111-4111-1111-111111111111'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text);

INSERT INTO public.events (id, owner_id, name, venue, event_date, set_time, status) VALUES
  ('33333333-3333-4333-3333-333333333333'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'Test Event', 'Test Venue', '2026-08-20 20:00:00'::timestamptz, '21:00:00'::text, 'pending'),
  ('99999999-9999-4999-9999-999999999999'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'Empty Event', 'Empty Venue', '2026-08-21 20:00:00'::timestamptz, '21:00:00'::text, 'pending');

INSERT INTO public.booking_requests (id, sender_id, event_id, recipient_id, conversation_id, status) VALUES
  ('44444444-4444-4444-4444-444444444444'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, '33333333-3333-4333-3333-333333333333'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text, '11111111-1111-4111-1111-111111111111'::uuid, 'pending');

-- ============================================================================
-- TEST SUITE: RPC Authorization (6 assertions)
-- ============================================================================

SELECT plan(6);

-- Test 1: authenticated cannot invoke mark_conversation_unread (expects 42501 permission denied)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.mark_conversation_unread(''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''11111111-1111-4111-1111-111111111111''::uuid, NULL::uuid);',
  '42501'
);

-- Test 2: anon cannot invoke mark_conversation_unread (expects 42501 permission denied)
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.mark_conversation_unread(''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''11111111-1111-4111-1111-111111111111''::uuid, NULL::uuid);',
  '42501'
);

-- Test 3: non-owner cannot cancel event (expects P0001 authorization exception)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.cancel_event(''33333333-3333-4333-3333-333333333333''::uuid);',
  'P0001'
);

-- Test 4: owner can cancel event
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT lives_ok(
  'SELECT public.cancel_event(''33333333-3333-4333-3333-333333333333''::uuid);',
  'owner can call cancel_event()'
);

-- Test 5: event status changed to cancelled
SELECT is(
  (SELECT status FROM public.events WHERE id = '33333333-3333-4333-3333-333333333333'::uuid),
  'cancelled'::text,
  'cancel_event() changes event status to cancelled'
);

-- Test 6: owner can delete empty event (fixture created in initial fixtures)
SELECT lives_ok(
  'SELECT public.delete_empty_event(''99999999-9999-4999-9999-999999999999''::uuid);',
  'owner can delete empty event'
);

SELECT finish();
ROLLBACK;
