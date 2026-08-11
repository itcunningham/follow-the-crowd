-- Follow The Crowd — Test 003: DM RLS Read Access Control
-- Verifies RLS filters conversations/messages for anon, non-members, and members.
-- Tests against the real migrated baseline + migrations 001-010 in local database.
-- LOCAL-ONLY: Run via `supabase test db`.

BEGIN;

-- ============================================================================
-- FIXTURES: Test data for DM conversation RLS verification
-- ============================================================================

-- ============================================================================
-- FIXTURES: Test data (DM conversation with two members)
-- ============================================================================

INSERT INTO public.conversations (id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid);

INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text),
  ('11111111-1111-4111-1111-111111111111'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text);

INSERT INTO public.messages (id, conversation_id, user_id, body) VALUES
  ('22222222-2222-4222-2222-222222222222'::uuid, '11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'Test message');

-- ============================================================================
-- TEST SUITE: RLS Read Access Control (6 assertions)
-- ============================================================================

SELECT plan(6);

-- Test 1: anon cannot read conversations (REVOKE SELECT — expects 42501)
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT id FROM public.conversations WHERE id = ''11111111-1111-4111-1111-111111111111''::uuid;',
  '42501'
);

-- Test 2: anon cannot read messages (REVOKE SELECT — expects 42501)
SELECT throws_ok(
  'SELECT id FROM public.messages WHERE conversation_id = ''11111111-1111-4111-1111-111111111111''::uuid;',
  '42501'
);

-- Test 3: non-member cannot read conversation (RLS filters)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"cccccccc-cccc-4ccc-cccc-cccccccccccc","role":"authenticated","aud":"authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM public.conversations WHERE id = '11111111-1111-4111-1111-111111111111'::uuid),
  0::bigint,
  'non-member cannot read conversation (RLS filters non-member)'
);

-- Test 4: non-member cannot read messages (RLS filters)
SELECT is(
  (SELECT COUNT(*) FROM public.messages WHERE conversation_id = '11111111-1111-4111-1111-111111111111'::uuid),
  0::bigint,
  'non-member cannot read messages in conversation (RLS filters non-member)'
);

-- Test 5: member can read conversation (RLS allows)
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM public.conversations WHERE id = '11111111-1111-4111-1111-111111111111'::uuid),
  1::bigint,
  'member can read conversation (RLS allows member)'
);

-- Test 6: member can read messages (RLS allows)
SELECT is(
  (SELECT COUNT(*) FROM public.messages WHERE conversation_id = '11111111-1111-4111-1111-111111111111'::uuid),
  1::bigint,
  'member can read messages in conversation (RLS allows member)'
);

SELECT finish();
ROLLBACK;
