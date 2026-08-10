-- Follow The Crowd — Test 005: RPC Authorization
-- Verifies RPC function access control and event ownership/state behavior.
-- LOCAL-ONLY: Run via `supabase test db`.
-- UNEXECUTED: Requires Docker/local Supabase with proper JWT context.

BEGIN;

-- BOOTSTRAP: Include schema, RLS policies, and functions
-- NOTE: \ir is UNVERIFIED under `supabase test db`
-- If \ir fails, inline the contents of ../../test-support/security_bootstrap.sql here
\ir ../../test-support/security_bootstrap.sql

-- ============================================================================
-- FIXTURES: Test data (event + DM conversation for cancellation flow)
-- ============================================================================

INSERT INTO public.conversations (id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid);

INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text),
  ('11111111-1111-4111-1111-111111111111'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text);

INSERT INTO public.events (id, owner_id, status) VALUES
  ('33333333-3333-4333-3333-333333333333'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'pending');

INSERT INTO public.booking_requests (id, event_id, recipient_id, conversation_id, status) VALUES
  ('44444444-4444-4444-4444-444444444444'::uuid, '33333333-3333-4333-3333-333333333333'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text, '11111111-1111-4111-1111-111111111111'::uuid, 'pending');

-- ============================================================================
-- TEST SUITE: RPC Authorization (mark_conversation_unread, cancel_event, delete_empty_event)
-- ============================================================================

SELECT plan(7);

-- Test 1: authenticated cannot invoke mark_conversation_unread (no EXECUTE)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.mark_conversation_unread(''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''11111111-1111-4111-1111-111111111111''::uuid, NULL::uuid);',
  '42501',
  'authenticated cannot invoke mark_conversation_unread (function EXECUTE not granted)'
);

-- Test 2: anon cannot invoke mark_conversation_unread (no EXECUTE)
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.mark_conversation_unread(''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''11111111-1111-4111-1111-111111111111''::uuid, NULL::uuid);',
  '42501',
  'anon cannot invoke mark_conversation_unread (function EXECUTE not granted)'
);

-- Test 3: non-owner cannot cancel event (authorization check)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT public.cancel_event(''33333333-3333-4333-3333-333333333333''::uuid);',
  'P0001',
  'non-owner cannot cancel event (authorization check enforced)'
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

-- Test 6: cancellation marked affected DJ unread (isolation)
SELECT is(
  (SELECT COUNT(*) FROM public.message_reads
   WHERE user_id = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text
   AND conversation_id = '11111111-1111-4111-1111-111111111111'::uuid),
  1::bigint,
  'cancellation called mark_conversation_unread: affected DJ has message_reads entry'
);

-- Test 7: owner can delete empty event
INSERT INTO public.events (id, owner_id, status) VALUES
  ('99999999-9999-4999-9999-999999999999'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'pending');

SELECT lives_ok(
  'SELECT public.delete_empty_event(''99999999-9999-4999-9999-999999999999''::uuid);',
  'owner can delete empty event'
);

SELECT finish();
ROLLBACK;
