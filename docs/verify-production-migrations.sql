-- Follow The Crowd — production migration verification
-- SELECT-only audit of all 10 migrations (20250710120000 through 20250805000001)
-- Queries PostgreSQL catalogs to verify exact final state
-- Safe for production: no CREATE/ALTER/DROP/INSERT/UPDATE/DELETE/GRANT/REVOKE
-- Use: psql postgresql://[user]:[password]@[host]:5432/postgres -f verify-production-migrations.sql

\echo '=== MIGRATION VERIFICATION ==='
\echo 'Checking 10 migrations applied correctly...'
\echo ''

-- ============================================================================
-- MIGRATION 001: 20250710120000_event_history_hide
-- Adds history_hidden_at column, index, and two SECURITY DEFINER functions
-- ============================================================================

\echo '--- Migration 001: event_history_hide ---'

-- Check 001-1: history_hidden_at column exists with correct type/nullability
SELECT
  'Migration 001-1: events.history_hidden_at column' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN data_type = 'timestamp with time zone' AND is_nullable = 'YES' THEN 'PASS'
      ELSE 'FAIL: type=' || data_type || ' nullable=' || is_nullable
    END
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'history_hidden_at'),
    'FAIL: column not found'
  ) AS status;

-- Check 001-2: Index events_owner_cancelled_visible_history_idx exists with correct definition
SELECT
  'Migration 001-2: events_owner_cancelled_visible_history_idx' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN indexdef LIKE '%owner_id%' AND indexdef LIKE '%created_at DESC%'
        AND indexdef LIKE '%status = ''cancelled''%' AND indexdef LIKE '%history_hidden_at is null%'
      THEN 'PASS'
      ELSE 'FAIL: index definition does not match: ' || indexdef
    END
    FROM pg_indexes
    WHERE indexname = 'events_owner_cancelled_visible_history_idx'),
    'FAIL: index not found'
  ) AS status;

-- Check 001-3: Function hide_event_from_history signature
SELECT
  'Migration 001-3: hide_event_from_history(uuid) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_event_id uuid'
        AND pg_get_function_result(p.oid) = 'jsonb'
        AND p.prosecdef = true
        AND p.proconfig::text LIKE '%search_path%'
      THEN 'PASS'
      ELSE 'FAIL: args=' || pg_get_function_identity_arguments(p.oid) || ' return=' || pg_get_function_result(p.oid) || ' secdef=' || p.prosecdef::text
    END
    FROM pg_proc p WHERE p.proname = 'hide_event_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 001-4: hide_event_from_history function body contains UPDATE ... history_hidden_at = now()
SELECT
  'Migration 001-4: hide_event_from_history function body' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%UPDATE%public.events%' AND pg_get_functiondef(p.oid) LIKE '%history_hidden_at = now()%'
        AND pg_get_functiondef(p.oid) LIKE '%owner_id = v_user_id%' AND pg_get_functiondef(p.oid) LIKE '%status = ''cancelled''%'
      THEN 'PASS'
      ELSE 'FAIL: missing expected UPDATE operations'
    END
    FROM pg_proc p WHERE p.proname = 'hide_event_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 001-5: Function hide_events_from_history signature
SELECT
  'Migration 001-5: hide_events_from_history(uuid[]) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_event_ids uuid[]' AND pg_get_function_result(p.oid) = 'jsonb' AND p.prosecdef = true
      THEN 'PASS'
      ELSE 'FAIL: signature incorrect'
    END
    FROM pg_proc p WHERE p.proname = 'hide_events_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 001-6: hide_event_from_history grant to authenticated
SELECT
  'Migration 001-6: hide_event_from_history execute grant' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.hide_event_from_history(uuid)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE' END AS status;

-- Check 001-7: hide_events_from_history grant to authenticated
SELECT
  'Migration 001-7: hide_events_from_history execute grant' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.hide_events_from_history(uuid[])', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 002: 20250710130000_booking_request_history_hides
-- New table with RLS, indexes, three SECURITY DEFINER functions
-- ============================================================================

\echo '--- Migration 002: booking_request_history_hides ---'

-- Check 002-1: Table exists
SELECT
  'Migration 002-1: booking_request_history_hides table exists' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_request_history_hides')
       THEN 'PASS' ELSE 'FAIL: table not found' END AS status;

-- Check 002-2: booking_request_id FK to booking_requests
SELECT
  'Migration 002-2: booking_request_id FK to booking_requests' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.referential_constraints WHERE constraint_name LIKE '%booking_request_history_hides%')
       THEN 'PASS' ELSE 'FAIL: FK not found' END AS status;

-- Check 002-3: Unique constraint (booking_request_id, user_id)
SELECT
  'Migration 002-3: unique (booking_request_id, user_id)' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'booking_request_history_hides' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%booking_user_key%')
       THEN 'PASS' ELSE 'FAIL: unique constraint not found' END AS status;

-- Check 002-4: Index on user_id
SELECT
  'Migration 002-4: user_id index' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'booking_request_history_hides_user_id_idx')
       THEN 'PASS' ELSE 'FAIL: index not found' END AS status;

-- Check 002-5: Index on booking_request_id
SELECT
  'Migration 002-5: booking_request_id index' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'booking_request_history_hides_booking_request_id_idx')
       THEN 'PASS' ELSE 'FAIL: index not found' END AS status;

-- Check 002-6: RLS enabled on table
SELECT
  'Migration 002-6: RLS enabled' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_class WHERE relname = 'booking_request_history_hides' AND relrowsecurity = true)
       THEN 'PASS' ELSE 'FAIL: RLS not enabled' END AS status;

-- Check 002-7: SELECT policy exists
SELECT
  'Migration 002-7: SELECT policy' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'booking_request_history_hides' AND policyname LIKE '%select_own%' AND cmd = 'SELECT')
       THEN 'PASS' ELSE 'FAIL: SELECT policy not found' END AS status;

-- Check 002-8: INSERT policy exists
SELECT
  'Migration 002-8: INSERT policy' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'booking_request_history_hides' AND policyname LIKE '%insert_own%' AND cmd = 'INSERT')
       THEN 'PASS' ELSE 'FAIL: INSERT policy not found' END AS status;

-- Check 002-9: DELETE policy exists
SELECT
  'Migration 002-9: DELETE policy' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'booking_request_history_hides' AND policyname LIKE '%delete_own%' AND cmd = 'DELETE')
       THEN 'PASS' ELSE 'FAIL: DELETE policy not found' END AS status;

-- Check 002-10: hide_booking_request_from_history function
SELECT
  'Migration 002-10: hide_booking_request_from_history(uuid) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid' AND pg_get_function_result(p.oid) = 'jsonb' AND p.prosecdef = true
      THEN 'PASS' ELSE 'FAIL: signature incorrect'
    END
    FROM pg_proc p WHERE p.proname = 'hide_booking_request_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 002-11: archive_booking_request grant to authenticated
SELECT
  'Migration 002-11: archive_booking_request execute grant' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.archive_booking_request(uuid)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 003: 20250710140000_booking_request_history_hides_grants
-- Grants select, insert, delete on booking_request_history_hides to authenticated
-- ============================================================================

\echo '--- Migration 003: booking_request_history_hides_grants ---'

-- Check 003-1: Authenticated SELECT grant on table
SELECT
  'Migration 003-1: authenticated SELECT on table' AS check_name,
  CASE WHEN has_table_privilege('authenticated', 'public.booking_request_history_hides', 'SELECT') THEN 'PASS'
       ELSE 'FAIL: authenticated missing SELECT' END AS status;

-- Check 003-2: Authenticated INSERT grant on table
SELECT
  'Migration 003-2: authenticated INSERT on table' AS check_name,
  CASE WHEN has_table_privilege('authenticated', 'public.booking_request_history_hides', 'INSERT') THEN 'PASS'
       ELSE 'FAIL: authenticated missing INSERT' END AS status;

-- Check 003-3: Authenticated DELETE grant on table
SELECT
  'Migration 003-3: authenticated DELETE on table' AS check_name,
  CASE WHEN has_table_privilege('authenticated', 'public.booking_request_history_hides', 'DELETE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing DELETE' END AS status;

-- Check 003-4: Anon has no SELECT on table (revoked)
SELECT
  'Migration 003-4: anon revoked SELECT' AS check_name,
  CASE WHEN NOT has_table_privilege('anon', 'public.booking_request_history_hides', 'SELECT') THEN 'PASS'
       ELSE 'FAIL: anon still has SELECT' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 004: 20250715180000_harden_crew_chat_auto_start_auth
-- Replaces ensure_event_crew_chat_auto_started function with hardened authorization
-- ============================================================================

\echo '--- Migration 004: harden_crew_chat_auto_start_auth ---'

-- Check 004-1: Function signature and SECURITY DEFINER
SELECT
  'Migration 004-1: ensure_event_crew_chat_auto_started(uuid) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_event_id uuid' AND pg_get_function_result(p.oid) = 'public.events' AND p.prosecdef = true
      THEN 'PASS' ELSE 'FAIL: signature or SECURITY DEFINER incorrect'
    END
    FROM pg_proc p WHERE p.proname = 'ensure_event_crew_chat_auto_started' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 004-2: Function body calls is_event_crew_participant
SELECT
  'Migration 004-2: calls is_event_crew_participant' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%is_event_crew_participant%'
      THEN 'PASS' ELSE 'FAIL: missing is_event_crew_participant call'
    END
    FROM pg_proc p WHERE p.proname = 'ensure_event_crew_chat_auto_started' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 004-3: Function body calls count_event_accepted_crew_djs
SELECT
  'Migration 004-3: calls count_event_accepted_crew_djs' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%count_event_accepted_crew_djs%'
      THEN 'PASS' ELSE 'FAIL: missing count_event_accepted_crew_djs call'
    END
    FROM pg_proc p WHERE p.proname = 'ensure_event_crew_chat_auto_started' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 004-4: Grant to authenticated
SELECT
  'Migration 004-4: grant execute to authenticated' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.ensure_event_crew_chat_auto_started(uuid)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 005: 20250715213000_remove_legacy_public_message_insert
-- Drops legacy policy, revokes INSERT from anon and public on messages
-- ============================================================================

\echo '--- Migration 005: remove_legacy_public_message_insert ---'

-- Check 005-1: Legacy policy dropped
SELECT
  'Migration 005-1: legacy policy removed' AS check_name,
  CASE WHEN NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'allow public insert messages')
       THEN 'PASS' ELSE 'FAIL: legacy policy still exists' END AS status;

-- Check 005-2: Anon revoked INSERT on messages
SELECT
  'Migration 005-2: anon revoked INSERT on messages' AS check_name,
  CASE WHEN NOT has_table_privilege('anon', 'public.messages', 'INSERT') THEN 'PASS'
       ELSE 'FAIL: anon still has INSERT' END AS status;

-- Check 005-3: PUBLIC revoked INSERT on messages
SELECT
  'Migration 005-3: public revoked INSERT on messages' AS check_name,
  CASE WHEN NOT has_table_privilege('public', 'public.messages', 'INSERT') THEN 'PASS'
       ELSE 'FAIL: public still has INSERT' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 006: 20250720120000_event_history_hide_past
-- New function planner_event_can_hide_from_history, replaces hide_event functions
-- ============================================================================

\echo '--- Migration 006: event_history_hide_past ---'

-- Check 006-1: planner_event_can_hide_from_history function exists with correct signature
SELECT
  'Migration 006-1: planner_event_can_hide_from_history(text,text,text) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_event_date text, p_set_time text, p_status text'
        AND pg_get_function_result(p.oid) = 'boolean' AND p.prosecdef = true
      THEN 'PASS' ELSE 'FAIL: signature incorrect'
    END
    FROM pg_proc p WHERE p.proname = 'planner_event_can_hide_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 006-2: planner_event_can_hide_from_history grant to authenticated
SELECT
  'Migration 006-2: planner_event_can_hide_from_history grant' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.planner_event_can_hide_from_history(text, text, text)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE' END AS status;

-- Check 006-3: hide_event_from_history body now calls planner function
SELECT
  'Migration 006-3: hide_event_from_history calls planner function' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%planner_event_can_hide_from_history%'
      THEN 'PASS' ELSE 'FAIL: missing call to planner_event_can_hide_from_history'
    END
    FROM pg_proc p WHERE p.proname = 'hide_event_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 006-4: hide_events_from_history body calls planner function
SELECT
  'Migration 006-4: hide_events_from_history calls planner function' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%planner_event_can_hide_from_history%'
      THEN 'PASS' ELSE 'FAIL: missing call to planner_event_can_hide_from_history'
    END
    FROM pg_proc p WHERE p.proname = 'hide_events_from_history' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

\echo ''

-- ============================================================================
-- MIGRATION 007: 20250729100000_message_reactions_realtime
-- Sets replica identity FULL on message_reactions, adds to realtime publication
-- ============================================================================

\echo '--- Migration 007: message_reactions_realtime ---'

-- Check 007-1: message_reactions replica identity set to FULL
SELECT
  'Migration 007-1: message_reactions replica identity FULL' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN relreplident = 'f' THEN 'PASS' ELSE 'FAIL: replica identity=' || relreplident
    END
    FROM pg_class WHERE relname = 'message_reactions' AND relnamespace = 'public'::regnamespace::oid),
    'FAIL: table not found'
  ) AS status;

-- Check 007-2: message_reactions in supabase_realtime publication
SELECT
  'Migration 007-2: message_reactions in supabase_realtime' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions')
       THEN 'PASS' ELSE 'FAIL: table not in publication' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 008: 20250730120000_reaction_notification_lifecycle
-- Adds reaction_id column, updates create_notification to 6 args, adds revoke_reaction_notification
-- ============================================================================

\echo '--- Migration 008: reaction_notification_lifecycle ---'

-- Check 008-1: reaction_id column exists
SELECT
  'Migration 008-1: notifications.reaction_id column' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'reaction_id' AND data_type = 'uuid' AND is_nullable = 'YES')
       THEN 'PASS' ELSE 'FAIL: column missing or wrong type/nullability' END AS status;

-- Check 008-2: Index on reaction_id
SELECT
  'Migration 008-2: notifications_reaction_id_idx' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_reaction_id_idx')
       THEN 'PASS' ELSE 'FAIL: index not found' END AS status;

-- Check 008-3: create_notification signature now has 6 parameters with p_reaction_id
SELECT
  'Migration 008-3: create_notification 6-arg signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) LIKE '%p_reaction_id uuid DEFAULT%'
      THEN 'PASS' ELSE 'FAIL: missing p_reaction_id parameter or wrong default'
    END
    FROM pg_proc p WHERE p.proname = 'create_notification' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 008-4: create_notification body handles reaction_id
SELECT
  'Migration 008-4: create_notification handles reaction_id' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%if p_reaction_id is not null%' AND pg_get_functiondef(p.oid) LIKE '%reaction_id = p_reaction_id%'
      THEN 'PASS' ELSE 'FAIL: missing reaction_id handling logic'
    END
    FROM pg_proc p WHERE p.proname = 'create_notification' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 008-5: revoke_reaction_notification function exists
SELECT
  'Migration 008-5: revoke_reaction_notification(uuid) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_reaction_id uuid' AND pg_get_function_result(p.oid) = 'integer' AND p.prosecdef = true
      THEN 'PASS' ELSE 'FAIL: signature incorrect'
    END
    FROM pg_proc p WHERE p.proname = 'revoke_reaction_notification' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 008-6: revoke_reaction_notification body deletes notifications by reaction_id
SELECT
  'Migration 008-6: revoke_reaction_notification deletes by reaction_id' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%delete from public.notifications%' AND pg_get_functiondef(p.oid) LIKE '%reaction_id = p_reaction_id%'
      THEN 'PASS' ELSE 'FAIL: missing DELETE logic for reaction_id'
    END
    FROM pg_proc p WHERE p.proname = 'revoke_reaction_notification' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 008-7: create_notification 6-arg grant to authenticated
SELECT
  'Migration 008-7: create_notification 6-arg grant' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.create_notification(text, text, text, text, text, uuid)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE on 6-arg version' END AS status;

-- Check 008-8: revoke_reaction_notification grant to authenticated
SELECT
  'Migration 008-8: revoke_reaction_notification grant' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.revoke_reaction_notification(uuid)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 009: 20250805000000_event_run_sheet_realtime
-- Sets replica identity FULL on event_run_sheet_rows, adds to realtime publication
-- ============================================================================

\echo '--- Migration 009: event_run_sheet_realtime ---'

-- Check 009-1: event_run_sheet_rows replica identity set to FULL
SELECT
  'Migration 009-1: event_run_sheet_rows replica identity FULL' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN relreplident = 'f' THEN 'PASS' ELSE 'FAIL: replica identity=' || relreplident
    END
    FROM pg_class WHERE relname = 'event_run_sheet_rows' AND relnamespace = 'public'::regnamespace::oid),
    'FAIL: table not found'
  ) AS status;

-- Check 009-2: event_run_sheet_rows in supabase_realtime publication
SELECT
  'Migration 009-2: event_run_sheet_rows in supabase_realtime' AS check_name,
  CASE WHEN EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'event_run_sheet_rows')
       THEN 'PASS' ELSE 'FAIL: table not in publication' END AS status;

\echo ''

-- ============================================================================
-- MIGRATION 010: 20250805000001_allow_pending_djs_to_view_run_sheet
-- CREATE OR REPLACE can_view_event_run_sheet with new authorization checks
-- ============================================================================

\echo '--- Migration 010: allow_pending_djs_to_view_run_sheet ---'

-- Check 010-1: can_view_event_run_sheet function exists with correct signature
SELECT
  'Migration 010-1: can_view_event_run_sheet(uuid) signature' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_function_identity_arguments(p.oid) = 'p_event_id uuid' AND pg_get_function_result(p.oid) = 'boolean' AND p.prosecdef = true
      THEN 'PASS' ELSE 'FAIL: signature or SECURITY DEFINER incorrect'
    END
    FROM pg_proc p WHERE p.proname = 'can_view_event_run_sheet' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 010-2: Function calls is_event_run_sheet_owner
SELECT
  'Migration 010-2: calls is_event_run_sheet_owner' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%is_event_run_sheet_owner%'
      THEN 'PASS' ELSE 'FAIL: missing is_event_run_sheet_owner call'
    END
    FROM pg_proc p WHERE p.proname = 'can_view_event_run_sheet' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 010-3: Function calls is_event_crew_participant
SELECT
  'Migration 010-3: calls is_event_crew_participant' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%is_event_crew_participant%'
      THEN 'PASS' ELSE 'FAIL: missing is_event_crew_participant call'
    END
    FROM pg_proc p WHERE p.proname = 'can_view_event_run_sheet' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 010-4: Function checks for pending/accepted booking_requests
SELECT
  'Migration 010-4: checks pending/accepted booking_requests' AS check_name,
  COALESCE(
    (SELECT CASE
      WHEN pg_get_functiondef(p.oid) LIKE '%booking_requests%' AND pg_get_functiondef(p.oid) LIKE '%pending%' AND pg_get_functiondef(p.oid) LIKE '%accepted%'
      THEN 'PASS' ELSE 'FAIL: missing booking_requests check'
    END
    FROM pg_proc p WHERE p.proname = 'can_view_event_run_sheet' AND p.pronamespace = 'public'::regnamespace),
    'FAIL: function not found'
  ) AS status;

-- Check 010-5: can_view_event_run_sheet grant to authenticated (from setupEventRunSheet.sql)
SELECT
  'Migration 010-5: grant execute to authenticated' AS check_name,
  CASE WHEN has_function_privilege('authenticated', 'public.can_view_event_run_sheet(uuid)', 'EXECUTE') THEN 'PASS'
       ELSE 'FAIL: authenticated missing EXECUTE grant' END AS status;

\echo ''
\echo '=== VERIFICATION COMPLETE ==='
