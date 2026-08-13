-- Phase 1 Diagnostic: Verify Migrations 002, 003, 005, 007, 009, 010
-- SELECT-only audit; safe to run; returns actual catalog state
-- No production modifications; no migration execution

-- ============================================================================
-- Migration 002: booking_request_history_hides (20250710130000)
-- ============================================================================

-- Check if table exists and has correct structure
select
  'Migration-002-table-booking_request_history_hides' as check_item,
  case
    when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'booking_request_history_hides'
    ) then 'EXISTS'
    else 'MISSING'
  end as status,
  null::text as details

union all

-- Check required columns
select
  'Migration-002-column-id',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'booking_request_history_hides' and column_name = 'id'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

select
  'Migration-002-column-booking_request_id',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'booking_request_history_hides' and column_name = 'booking_request_id'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

select
  'Migration-002-column-user_id',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'booking_request_history_hides' and column_name = 'user_id'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

select
  'Migration-002-column-hidden_at',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'booking_request_history_hides' and column_name = 'hidden_at'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

-- Check RLS enabled
select
  'Migration-002-rls-enabled',
  case when exists (
    select 1 from pg_class c
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public' and c.relname = 'booking_request_history_hides'
    and c.relrowsecurity = true
  ) then 'YES' else 'NO' end,
  null::text

union all

-- Check for RLS policies
select
  'Migration-002-policy-booking_request_history_hides_select_own',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_request_history_hides'
    and policyname = 'booking_request_history_hides_select_own'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

select
  'Migration-002-policy-booking_request_history_hides_insert_own',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_request_history_hides'
    and policyname = 'booking_request_history_hides_insert_own'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

select
  'Migration-002-policy-booking_request_history_hides_delete_own',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_request_history_hides'
    and policyname = 'booking_request_history_hides_delete_own'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

-- Check indexes
select
  'Migration-002-index-booking_request_history_hides_user_id_idx',
  case when exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'booking_request_history_hides'
    and indexname = 'booking_request_history_hides_user_id_idx'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

select
  'Migration-002-index-booking_request_history_hides_booking_request_id_idx',
  case when exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'booking_request_history_hides'
    and indexname = 'booking_request_history_hides_booking_request_id_idx'
  ) then 'EXISTS' else 'MISSING' end,
  null::text

union all

-- Check functions
select
  'Migration-002-function-hide_booking_request_from_history',
  case when exists (
    select 1 from pg_proc p
    where p.proname = 'hide_booking_request_from_history'
    and p.pronamespace = 'public'::regnamespace
    and pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid'
  ) then 'EXISTS' else 'MISSING' end,
  (select pg_get_functiondef(p.oid) from pg_proc p
   where p.proname = 'hide_booking_request_from_history'
   and p.pronamespace = 'public'::regnamespace
   and pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid' limit 1)

union all

select
  'Migration-002-function-hide_booking_requests_from_history',
  case when exists (
    select 1 from pg_proc p
    where p.proname = 'hide_booking_requests_from_history'
    and p.pronamespace = 'public'::regnamespace
    and pg_get_function_identity_arguments(p.oid) = 'p_booking_ids uuid[]'
  ) then 'EXISTS' else 'MISSING' end,
  (select pg_get_functiondef(p.oid) from pg_proc p
   where p.proname = 'hide_booking_requests_from_history'
   and p.pronamespace = 'public'::regnamespace
   and pg_get_function_identity_arguments(p.oid) = 'p_booking_ids uuid[]' limit 1)

union all

select
  'Migration-002-function-archive_booking_request',
  case when exists (
    select 1 from pg_proc p
    where p.proname = 'archive_booking_request'
    and p.pronamespace = 'public'::regnamespace
    and pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid'
  ) then 'EXISTS' else 'MISSING' end,
  (select pg_get_functiondef(p.oid) from pg_proc p
   where p.proname = 'archive_booking_request'
   and p.pronamespace = 'public'::regnamespace
   and pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid' limit 1)

union all

-- ============================================================================
-- Migration 003: booking_request_history_hides_grants (20250710140000)
-- ============================================================================

select
  'Migration-003-grants-booking_request_history_hides_to_authenticated',
  case when exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'booking_request_history_hides'
    and grantee = 'authenticated'
    and privilege_type in ('SELECT', 'INSERT', 'DELETE')
  ) then 'HAS_GRANTS' else 'MISSING' end,
  (select string_agg(privilege_type, ',') from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'booking_request_history_hides'
   and grantee = 'authenticated')

union all

-- ============================================================================
-- Migration 005: remove_legacy_public_message_insert (20250715213000)
-- ============================================================================

select
  'Migration-005-policy-allow_public_insert_messages',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
    and policyname = 'allow public insert messages'
  ) then 'STILL_EXISTS' else 'DROPPED' end,
  null::text

union all

-- ============================================================================
-- Migration 007: message_reactions_realtime (20250729100000)
-- ============================================================================

select
  'Migration-007-table-message_reactions-replica_identity',
  coalesce(
    (select relreplident::text from pg_class c
     join pg_namespace n on c.relnamespace = n.oid
     where n.nspname = 'public' and c.relname = 'message_reactions'),
    'TABLE_MISSING'
  ) as status,
  case
    when (select relreplident from pg_class c
          join pg_namespace n on c.relnamespace = n.oid
          where n.nspname = 'public' and c.relname = 'message_reactions') = 'f'
    then 'Full (correct)'
    else 'Not full (incorrect)'
  end

union all

select
  'Migration-007-publication-message_reactions_in_supabase_realtime',
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'message_reactions'
  ) then 'YES' else 'NO' end,
  null::text

union all

-- ============================================================================
-- Migration 009: event_run_sheet_realtime (20250805000000)
-- ============================================================================

select
  'Migration-009-table-event_run_sheet_rows-replica_identity',
  coalesce(
    (select relreplident::text from pg_class c
     join pg_namespace n on c.relnamespace = n.oid
     where n.nspname = 'public' and c.relname = 'event_run_sheet_rows'),
    'TABLE_MISSING'
  ) as status,
  case
    when (select relreplident from pg_class c
          join pg_namespace n on c.relnamespace = n.oid
          where n.nspname = 'public' and c.relname = 'event_run_sheet_rows') = 'f'
    then 'Full (correct)'
    else 'Not full (incorrect)'
  end

union all

select
  'Migration-009-publication-event_run_sheet_rows_in_supabase_realtime',
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'event_run_sheet_rows'
  ) then 'YES' else 'NO' end,
  null::text

union all

-- ============================================================================
-- Migration 010: allow_pending_djs_to_view_run_sheet (20250805000001)
-- ============================================================================

select
  'Migration-010-function-can_view_event_run_sheet',
  case when exists (
    select 1 from pg_proc p
    where p.proname = 'can_view_event_run_sheet'
    and p.pronamespace = 'public'::regnamespace
    and pg_get_function_identity_arguments(p.oid) = 'p_event_id uuid'
  ) then 'EXISTS' else 'MISSING' end,
  (select pg_get_functiondef(p.oid) from pg_proc p
   where p.proname = 'can_view_event_run_sheet'
   and p.pronamespace = 'public'::regnamespace
   and pg_get_function_identity_arguments(p.oid) = 'p_event_id uuid' limit 1)

union all

-- Final row to ensure non-empty result set
select
  'diagnostic-complete',
  'Phase 1 audit for Migrations 002, 003, 005, 007, 009, 010',
  'Produced by docs/diagnostic-unknown-migrations.sql'

order by check_item;
