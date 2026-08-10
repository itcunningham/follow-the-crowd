-- Follow The Crowd — Test 004: Message Insert Authorization (RLS WITH CHECK)
-- Verifies RLS WITH CHECK blocks spoofed user_id and non-member inserts.
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

-- ============================================================================
-- TEST SUITE: Message Insert Authorization
-- ============================================================================

SELECT plan(4);

-- Test 1: member can insert message as themselves
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT lives_ok(
  'INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES (''55555555-5555-4555-5555-555555555555''::uuid, ''11111111-1111-4111-1111-111111111111''::uuid, ''aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa''::text, ''Member insert'');',
  'member can insert message as themselves'
);

-- Test 2: member cannot insert with different user_id (RLS WITH CHECK blocks)
SELECT throws_ok(
  'INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES (''66666666-6666-4666-6666-666666666666''::uuid, ''11111111-1111-4111-1111-111111111111''::uuid, ''bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb''::text, ''Spoofed insert'');',
  '42501',
  'member cannot insert message with different user_id (RLS WITH CHECK blocks spoofing)'
);

-- Test 3: non-member cannot insert message (RLS WITH CHECK blocks)
SET LOCAL "request.jwt.claims" = '{"sub":"cccccccc-cccc-4ccc-cccc-cccccccccccc","role":"authenticated","aud":"authenticated"}';

SELECT throws_ok(
  'INSERT INTO public.messages (id, conversation_id, user_id, text) VALUES (''77777777-7777-4777-7777-777777777777''::uuid, ''11111111-1111-4111-1111-111111111111''::uuid, ''cccccccc-cccc-4ccc-cccc-cccccccccccc''::text, ''Non-member insert'');',
  '42501',
  'non-member cannot insert message (RLS WITH CHECK blocks non-member)'
);

-- Test 4: Verify first insert succeeded (message visible to inserter)
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM public.messages WHERE id = '55555555-5555-4555-5555-555555555555'::uuid),
  1::bigint,
  'message insert from Test 1 succeeded and is visible to inserter'
);

SELECT finish();
ROLLBACK;
