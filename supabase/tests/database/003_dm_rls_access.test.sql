-- Follow The Crowd — Test 003: DM RLS Read Access Control
-- Verifies RLS filters conversations/messages for anon, non-members, and members.
-- LOCAL-ONLY: Run via `supabase test db`.
-- UNEXECUTED: Requires Docker/local Supabase with proper JWT context.

BEGIN;

-- BOOTSTRAP: Include schema, RLS policies, and functions
-- NOTE: \ir is UNVERIFIED under `supabase test db`
-- If \ir fails, inline the contents of ../../test-support/security_bootstrap.sql here
\ir ../../test-support/security_bootstrap.sql

-- ============================================================================
-- FIXTURES: Test data (DM conversation with two members)
-- ============================================================================

INSERT INTO public.conversations (id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid);

INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
  ('11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text),
  ('11111111-1111-4111-1111-111111111111'::uuid, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text);

INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES
  ('22222222-2222-4222-2222-222222222222'::uuid, '11111111-1111-4111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text, 'Test message');

-- ============================================================================
-- TEST SUITE: RLS Read Access Control
-- ============================================================================

SELECT plan(6);

-- Test 1: anon cannot read conversations (REVOKE SELECT)
-- anon has insufficient privilege (42501) before RLS filtering
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT throws_ok(
  'SELECT id FROM public.conversations WHERE id = ''11111111-1111-4111-1111-111111111111''::uuid;',
  '42501',
  'anon role denied SELECT on conversations (insufficient privilege)'
);

-- Test 2: anon cannot read messages (REVOKE SELECT)
SELECT throws_ok(
  'SELECT id FROM public.messages WHERE conversation_id = ''11111111-1111-4111-1111-111111111111''::uuid;',
  '42501',
  'anon role denied SELECT on messages (insufficient privilege)'
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
