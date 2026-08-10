-- Production Migration Verification Script (READ-ONLY)
-- Verifies that all 10 migrations have been correctly applied to production.
-- Uses only SELECT queries against PostgreSQL catalogs and information_schema.
-- Safe to run against production: no modifications, no migration history changes.

\echo '============================================================================'
\echo 'PRODUCTION MIGRATION VERIFICATION SCRIPT'
\echo 'Checks: Tables, Columns, Indexes, Functions, RLS Policies, Grants, Replica Identity'
\echo '============================================================================'

-- Migration 001: 20250710120000_event_history_hide.sql
\echo ''
\echo '--- Migration 001: event_history_hide ---'

\echo 'CHECK: Column public.events.history_hidden_at exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'history_hidden_at'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Index events_owner_cancelled_visible_history_idx exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND indexname = 'events_owner_cancelled_visible_history_idx'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.hide_event_from_history(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'hide_event_from_history'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.hide_events_from_history(uuid[]) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'hide_events_from_history'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Authenticated role has execute on hide_event_from_history'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'hide_event_from_history'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 002: 20250710130000_booking_request_history_hides.sql
\echo ''
\echo '--- Migration 002: booking_request_history_hides ---'

\echo 'CHECK: Table public.booking_request_history_hides exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Column booking_request_id on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
      AND column_name = 'booking_request_id'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Column user_id on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
      AND column_name = 'user_id'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Column hidden_at on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
      AND column_name = 'hidden_at'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: RLS enabled on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'booking_request_history_hides'
      AND rowsecurity = true
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: RLS policy booking_request_history_hides_select_own exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_request_history_hides'
      AND policyname = 'booking_request_history_hides_select_own'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: RLS policy booking_request_history_hides_insert_own exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_request_history_hides'
      AND policyname = 'booking_request_history_hides_insert_own'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: RLS policy booking_request_history_hides_delete_own exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_request_history_hides'
      AND policyname = 'booking_request_history_hides_delete_own'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.hide_booking_request_from_history(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'hide_booking_request_from_history'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.hide_booking_requests_from_history(uuid[]) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'hide_booking_requests_from_history'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.archive_booking_request(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'archive_booking_request'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 003: 20250710140000_booking_request_history_hides_grants.sql
\echo ''
\echo '--- Migration 003: booking_request_history_hides_grants ---'

\echo 'CHECK: Authenticated role has select on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Authenticated role has insert on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
      AND grantee = 'authenticated'
      AND privilege_type = 'INSERT'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Authenticated role has delete on booking_request_history_hides'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
      AND grantee = 'authenticated'
      AND privilege_type = 'DELETE'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 004: 20250715180000_harden_crew_chat_auto_start_auth.sql
\echo ''
\echo '--- Migration 004: harden_crew_chat_auto_start_auth ---'

\echo 'CHECK: Function public.ensure_event_crew_chat_auto_started(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'ensure_event_crew_chat_auto_started'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Authenticated role has execute on ensure_event_crew_chat_auto_started'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'ensure_event_crew_chat_auto_started'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 005: 20250715213000_remove_legacy_public_message_insert.sql
\echo ''
\echo '--- Migration 005: remove_legacy_public_message_insert ---'

\echo 'CHECK: Anon role does NOT have insert on messages'
SELECT
  CASE WHEN NOT EXISTS(
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND grantee = 'anon'
      AND privilege_type = 'INSERT'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 006: 20250720120000_event_history_hide_past.sql
\echo ''
\echo '--- Migration 006: event_history_hide_past ---'

\echo 'CHECK: Function public.planner_event_can_hide_from_history(text, text, text) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'planner_event_can_hide_from_history'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Authenticated role has execute on planner_event_can_hide_from_history'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'planner_event_can_hide_from_history'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 007: 20250729100000_message_reactions_realtime.sql
\echo ''
\echo '--- Migration 007: message_reactions_realtime ---'

\echo 'CHECK: Table public.message_reactions exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'message_reactions'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Table public.message_reactions replica identity set to FULL'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_class
    WHERE relname = 'message_reactions'
      AND relreplident = 'f'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 008: 20250730120000_reaction_notification_lifecycle.sql
\echo ''
\echo '--- Migration 008: reaction_notification_lifecycle ---'

\echo 'CHECK: Table public.notifications exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Column reaction_id on notifications'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'reaction_id'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Index notifications_reaction_id_idx exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND indexname = 'notifications_reaction_id_idx'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.create_notification exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_notification'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Function public.revoke_reaction_notification(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'revoke_reaction_notification'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Authenticated role has execute on create_notification'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND routine_name = 'create_notification'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 009: 20250805000000_event_run_sheet_realtime.sql
\echo ''
\echo '--- Migration 009: event_run_sheet_realtime ---'

\echo 'CHECK: Table public.event_run_sheet_rows exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'event_run_sheet_rows'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo 'CHECK: Table public.event_run_sheet_rows replica identity set to FULL'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_class
    WHERE relname = 'event_run_sheet_rows'
      AND relreplident = 'f'
  ) THEN 'PASS' ELSE 'FAIL' END;

-- Migration 010: 20250805000001_allow_pending_djs_to_view_run_sheet.sql
\echo ''
\echo '--- Migration 010: allow_pending_djs_to_view_run_sheet ---'

\echo 'CHECK: Function public.can_view_event_run_sheet(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'can_view_event_run_sheet'
  ) THEN 'PASS' ELSE 'FAIL' END;

\echo ''
\echo '============================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '============================================================================'
