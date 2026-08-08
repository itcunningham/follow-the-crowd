-- Supplement to supabaseSecurityAuditChecklist.sql — Follow The Crowd.
-- Paste into Supabase SQL Editor and run as-is, after the main checklist.
--
-- STRICTLY DIAGNOSTIC. This script contains only SELECT statements against
-- system catalogues. It does not modify data, schema, policies, storage,
-- grants or roles, and it reads no user rows.
--
-- WHY THIS EXISTS
--
-- The main checklist covers 16 checks and catches the highest-risk
-- regressions — notably `messages_select_event_authenticated absent`, which is
-- the policy setupProductionRls.sql creates and setupEventCrewChat.sql later
-- drops. Because the setup scripts are applied by hand and have no migration
-- history, re-running an earlier script silently reinstates a broader policy.
-- Postgres permissive policies are OR'd together, so one stale broad policy
-- defeats every tighter policy beside it.
--
-- These five queries close three gaps in the main checklist:
--   * check 12 inspects INSERT/UPDATE/DELETE only, never SELECT
--   * check 12 covers six tables and does not include public.users
--   * check 9 proves create_notification is callable, not that it is unique
-- plus two invariants the checklist does not cover at all.

-- =============================================================================
-- 1. message_reads: is the DM / crew-chat boundary enforced by the database?
-- =============================================================================
-- VERIFIES: that a message_reads row can only ever belong to a DM
--   (conversation_id) or a crew chat (event_id), never both.
--
-- WHY IT MATTERS: buildConversationReadMap and buildEventChatReadMap read the
--   same rows and partition them purely on which column is non-null. A row with
--   both populated lands in BOTH maps, so opening a crew chat would mark a DM
--   read — silently suppressing a real unread. That is a missed message, the
--   worst failure mode in the unread system. Application code enforces this
--   today (upsertMessageRead scopes on `.is(other, null)`); nothing else does.
--
-- SAFE RESULT: a CHECK definition containing num_nonnulls(conversation_id,
--   event_id) = 1, or an equivalent XOR expression.
--
-- ESCALATE IF: actual is 'NO CHECK CONSTRAINT'. Not an emergency — the app
--   cannot currently create such a row — but it should be decided on before
--   uncoached users depend on unread state.

select
  'message_reads one-id constraint' as check_name,
  coalesce(
    (
      select string_agg(pg_get_constraintdef(c.oid), ' | ')
      from pg_constraint c
      where c.conrelid = to_regclass('public.message_reads')
        and c.contype = 'c'
    ),
    'NO CHECK CONSTRAINT'
  ) as actual;

-- =============================================================================
-- 2. HIGHEST PRIORITY — any anon/public policy, read or write, anywhere
-- =============================================================================
-- VERIFIES: that no policy on any table in `public` is granted to the `anon` or
--   `public` roles, for any command.
--
-- WHY IT MATTERS: the legacy setup scripts created broad policies
--   ("Allow anon select conversations", "Allow public read users",
--   "Allow public update users", and ~20 more). setupProductionRls.sql drops
--   them, but only if it ran after the scripts that created them. Main-checklist
--   check 12 would not catch a surviving SELECT policy, and does not look at
--   public.users at all. A live anon SELECT on messages or conversations means
--   private DMs are readable without authentication.
--
-- SAFE RESULT: ZERO ROWS. That is the answer you want.
--
-- ESCALATE IF: any row is returned for messages, conversations,
--   conversation_members, booking_requests, notifications or users.
--   Stop and inspect before beta — do not treat as routine.
--   Rows on genuinely public-by-design tables may be legitimate; confirm intent
--   per table rather than assuming.

select
  'anon/public policy present' as check_name,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles::text as roles,
  p.qual,
  p.with_check
from pg_policies p
where p.schemaname = 'public'
  and (
    'anon'::name = any (p.roles)
    or 'public'::name = any (p.roles)
  )
order by p.tablename, p.cmd, p.policyname;

-- =============================================================================
-- 3. create_notification: exactly one overload?
-- =============================================================================
-- VERIFIES: how many create_notification overloads exist.
--
-- WHY IT MATTERS: two overloads (5-arg and 6-arg) currently coexist. Any call
--   omitting p_reaction_id fails with PGRST203 "Could not choose the best
--   candidate function". The application avoids this by always sending
--   p_reaction_id from its single call site in lib/notifications.ts, so there is
--   no user-facing impact today — but any new or direct 5-arg caller would
--   silently lose notifications. Main-checklist check 9 passes either way,
--   because it only asks whether the 6-arg form is callable.
--
-- SAFE RESULT: actual = 1.
--
-- ESCALATE IF: actual > 1. Low urgency while the single call site holds.
--   scripts/fixCreateNotification.sql is the intended remedy; applying it is a
--   separate, approved decision — not part of this diagnostic.

select
  'create_notification overloads' as check_name,
  count(*) as actual,
  string_agg(pg_get_function_identity_arguments(p.oid), ' || ' order by p.oid) as signatures
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_notification';

-- =============================================================================
-- 4. Is RLS actually enabled on every table that relies on it?
-- =============================================================================
-- VERIFIES: relrowsecurity per table. Policies on a table with RLS disabled are
--   inert — the table is fully readable and writable by anyone with table
--   grants, and the policy list still looks correct in the dashboard.
--
-- SAFE RESULT: rls_enabled = true for every row returned.
--
-- ESCALATE IF: rls_enabled = false on any row. That table's policies are not
--   being applied at all. Treat as critical for messages, message_reads,
--   conversations, conversation_members, booking_requests, users.
--
-- NOTE: rls_forced = false is normal and expected. It only affects the table
--   owner, and Supabase clients do not connect as the owner.

select
  'rls enabled' as check_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'messages', 'message_reads', 'message_attachments', 'message_reactions',
    'conversations', 'conversation_members',
    'booking_requests', 'booking_plans',
    'events', 'event_run_sheet_rows', 'event_run_sheet_columns',
    'notifications', 'users', 'dj_availability',
    'user_blocks', 'user_reports'
  )
order by c.relname;

-- =============================================================================
-- 5. message_reads policies — unread-state integrity
-- =============================================================================
-- VERIFIES: which policies govern message_reads, and their USING clauses.
--
-- WHY IT MATTERS: message_reads drives every unread badge in the product. A
--   policy allowing a user to read or write another user's rows would let one
--   account clear or forge another account's unread state. The main checklist
--   does not examine this table.
--
-- SAFE RESULT: four policies (select/insert/update/delete), all scoped to the
--   owning user — the qual/with_check should compare user_id against the
--   authenticated user, and no policy should be granted to anon or public.
--
-- ESCALATE IF: any policy is missing a user_id ownership predicate, or grants
--   anon/public (query 2 would also flag the latter).

select
  'message_reads policy' as check_name,
  p.policyname,
  p.cmd,
  p.roles::text as roles,
  p.qual,
  p.with_check
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'message_reads'
order by p.cmd, p.policyname;
