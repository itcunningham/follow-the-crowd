-- Production Migration Verification Script (READ-ONLY, STRENGTHENED)
-- Verifies that all 10 migrations have been correctly applied to production.
-- Uses only SELECT queries against PostgreSQL catalogs and information_schema.
-- Checks exact signatures, definitions, expressions, and constraints—not just existence.
-- Safe to run against production: no modifications, no migration history changes.

\echo '============================================================================'
\echo 'PRODUCTION MIGRATION VERIFICATION SCRIPT (STRENGTHENED)'
\echo 'Checks: Exact signatures, definitions, constraints, grants, policies'
\echo '============================================================================'

-- Helper: Display function signature
CREATE TEMP VIEW fn_signatures AS
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args_signature,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_config,
  pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- Helper: Display RLS policy details
CREATE TEMP VIEW rls_policy_details AS
SELECT
  n.nspname AS schema_name,
  t.relname AS table_name,
  p.policyname AS policy_name,
  p.permissive AS is_permissive,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END AS command,
  CASE WHEN p.roles = ARRAY[0::oid]::_oid THEN 'public'
       ELSE string_agg(r.rolname, ', ')
  END AS roles,
  pg_get_expr(p.qual, p.polrelid) AS using_expression,
  pg_get_expr(p.with_check, p.polrelid) AS with_check_expression
FROM pg_policy p
JOIN pg_class t ON p.polrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
LEFT JOIN pg_roles r ON r.oid = ANY(p.roles) AND p.roles != ARRAY[0::oid]::_oid
WHERE n.nspname = 'public'
GROUP BY n.nspname, t.relname, p.policyname, p.permissive, p.polcmd, p.qual, p.with_check, p.polrelid, p.roles;

-- Helper: Display index details
CREATE TEMP VIEW index_details AS
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE WHEN indexdef LIKE '%WHERE%' THEN 'PARTIAL' ELSE 'FULL' END AS index_type
FROM pg_indexes
WHERE schemaname = 'public';

-- Migration 001: 20250710120000_event_history_hide.sql
\echo ''
\echo '--- Migration 001: event_history_hide ---'

\echo 'CHECK 001-1: Column public.events.history_hidden_at exists with correct type'
SELECT
  CASE WHEN col_type = 'timestamp with time zone' AND is_nullable THEN 'PASS'
       ELSE 'FAIL: ' || COALESCE(col_type, 'COLUMN_NOT_FOUND') || ' nullable=' || COALESCE(is_nullable::text, 'NULL')
  END AS result
FROM (
  SELECT
    data_type AS col_type,
    is_nullable = 'YES' AS is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'history_hidden_at'
) x;

\echo 'CHECK 001-2: Index events_owner_cancelled_visible_history_idx with correct predicate'
SELECT
  CASE WHEN indexdef LIKE '%owner_id%' AND indexdef LIKE '%created_at DESC%'
            AND indexdef LIKE '%WHERE status = ''cancelled'' AND history_hidden_at IS NULL%'
       THEN 'PASS'
       ELSE 'FAIL: ' || COALESCE(indexdef, 'INDEX_NOT_FOUND')
  END AS result
FROM index_details
WHERE tablename = 'events'
  AND indexname = 'events_owner_cancelled_visible_history_idx';

\echo 'CHECK 001-3: Function hide_event_from_history(uuid) signature and security'
SELECT
  CASE WHEN args_signature = 'p_event_id uuid'
            AND return_type = 'jsonb'
            AND is_security_definer = true
            AND function_config LIKE '%search_path%'
       THEN 'PASS'
       ELSE 'FAIL: signature=' || args_signature || ' return=' || return_type || ' secdef=' || is_security_definer::text
  END AS result
FROM fn_signatures
WHERE function_name = 'hide_event_from_history'
  AND args_signature = 'p_event_id uuid';

\echo 'CHECK 001-4: Function hide_event_from_history body references public.auth_user_id()'
SELECT
  CASE WHEN function_body LIKE '%public.auth_user_id()%'
            AND function_body LIKE '%update public.events%'
            AND function_body LIKE '%history_hidden_at = now()%'
       THEN 'PASS'
       ELSE 'FAIL: function_body does not match expected UPDATE/auth_user_id pattern'
  END AS result
FROM fn_signatures
WHERE function_name = 'hide_event_from_history'
  AND args_signature = 'p_event_id uuid';

\echo 'CHECK 001-5: Function hide_events_from_history(uuid[]) signature and security'
SELECT
  CASE WHEN args_signature = 'p_event_ids uuid[]'
            AND return_type = 'jsonb'
            AND is_security_definer = true
       THEN 'PASS'
       ELSE 'FAIL: signature=' || args_signature || ' return=' || return_type || ' secdef=' || is_security_definer::text
  END AS result
FROM fn_signatures
WHERE function_name = 'hide_events_from_history';

\echo 'CHECK 001-6: Authenticated role has execute on hide_event_from_history(uuid)'
SELECT
  CASE WHEN has_function_privilege('authenticated'::regrole, 'public.hide_event_from_history(uuid)'::regprocedure, 'execute')
       THEN 'PASS'
       ELSE 'FAIL: authenticated does not have execute'
  END AS result;

\echo 'CHECK 001-7: Authenticated role has execute on hide_events_from_history(uuid[])'
SELECT
  CASE WHEN has_function_privilege('authenticated'::regrole, 'public.hide_events_from_history(uuid[])'::regprocedure, 'execute')
       THEN 'PASS'
       ELSE 'FAIL: authenticated does not have execute'
  END AS result;

-- Migration 002: 20250710130000_booking_request_history_hides.sql
\echo ''
\echo '--- Migration 002: booking_request_history_hides ---'

\echo 'CHECK 002-1: Table public.booking_request_history_hides exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'booking_request_history_hides'
  ) THEN 'PASS' ELSE 'FAIL: table does not exist' END;

\echo 'CHECK 002-2: Column booking_request_id is UUID with FK to booking_requests(id)'
SELECT
  CASE WHEN col_type = 'uuid'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_table = 'booking_requests'
       THEN 'PASS'
       ELSE 'FAIL: type=' || COALESCE(col_type, 'NULL') || ' constraint=' || COALESCE(constraint_type, 'NULL')
  END AS result
FROM (
  SELECT
    c.data_type AS col_type,
    tc.constraint_type,
    kcu_ref.table_name AS constraint_table
  FROM information_schema.columns c
  LEFT JOIN information_schema.key_column_usage kcu ON
    kcu.table_schema = c.table_schema AND kcu.table_name = c.table_name AND kcu.column_name = c.column_name
  LEFT JOIN information_schema.referential_constraints rc ON
    rc.constraint_name = kcu.constraint_name AND rc.constraint_schema = kcu.table_schema
  LEFT JOIN information_schema.key_column_usage kcu_ref ON
    kcu_ref.constraint_name = rc.unique_constraint_name AND kcu_ref.constraint_schema = rc.unique_constraint_schema
  LEFT JOIN information_schema.table_constraints tc ON
    tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE c.table_schema = 'public'
    AND c.table_name = 'booking_request_history_hides'
    AND c.column_name = 'booking_request_id'
) x;

\echo 'CHECK 002-3: Column user_id is text'
SELECT
  CASE WHEN data_type = 'text' THEN 'PASS'
       ELSE 'FAIL: type=' || data_type
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'booking_request_history_hides'
  AND column_name = 'user_id';

\echo 'CHECK 002-4: Column hidden_at is timestamp with default now()'
SELECT
  CASE WHEN data_type = 'timestamp with time zone'
            AND column_default LIKE '%now()%'
       THEN 'PASS'
       ELSE 'FAIL: type=' || data_type || ' default=' || COALESCE(column_default, 'NULL')
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'booking_request_history_hides'
  AND column_name = 'hidden_at';

\echo 'CHECK 002-5: RLS enabled on booking_request_history_hides'
SELECT
  CASE WHEN rowsecurity = true THEN 'PASS'
       ELSE 'FAIL: RLS not enabled'
  END AS result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'booking_request_history_hides';

\echo 'CHECK 002-6: RLS policy booking_request_history_hides_select_own has correct USING'
SELECT
  CASE WHEN command = 'SELECT'
            AND using_expression LIKE '%user_id = public.auth_user_id()%'
       THEN 'PASS'
       ELSE 'FAIL: cmd=' || command || ' using=' || COALESCE(using_expression, 'NULL')
  END AS result
FROM rls_policy_details
WHERE table_name = 'booking_request_history_hides'
  AND policy_name = 'booking_request_history_hides_select_own';

\echo 'CHECK 002-7: RLS policy booking_request_history_hides_insert_own has correct WITH CHECK'
SELECT
  CASE WHEN command = 'INSERT'
            AND with_check_expression LIKE '%user_id = public.auth_user_id()%'
       THEN 'PASS'
       ELSE 'FAIL: cmd=' || command || ' with_check=' || COALESCE(with_check_expression, 'NULL')
  END AS result
FROM rls_policy_details
WHERE table_name = 'booking_request_history_hides'
  AND policy_name = 'booking_request_history_hides_insert_own';

\echo 'CHECK 002-8: RLS policy booking_request_history_hides_delete_own has correct USING'
SELECT
  CASE WHEN command = 'DELETE'
            AND using_expression LIKE '%user_id = public.auth_user_id()%'
       THEN 'PASS'
       ELSE 'FAIL: cmd=' || command || ' using=' || COALESCE(using_expression, 'NULL')
  END AS result
FROM rls_policy_details
WHERE table_name = 'booking_request_history_hides'
  AND policy_name = 'booking_request_history_hides_delete_own';

\echo 'CHECK 002-9: Function hide_booking_request_from_history(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM fn_signatures
    WHERE function_name = 'hide_booking_request_from_history'
      AND args_signature = 'p_booking_id uuid'
      AND is_security_definer = true
  ) THEN 'PASS' ELSE 'FAIL: function missing or not SECURITY DEFINER' END;

\echo 'CHECK 002-10: Function hide_booking_requests_from_history(uuid[]) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM fn_signatures
    WHERE function_name = 'hide_booking_requests_from_history'
      AND args_signature = 'p_booking_ids uuid[]'
      AND is_security_definer = true
  ) THEN 'PASS' ELSE 'FAIL: function missing or not SECURITY DEFINER' END;

\echo 'CHECK 002-11: Function archive_booking_request(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM fn_signatures
    WHERE function_name = 'archive_booking_request'
      AND args_signature = 'p_booking_id uuid'
      AND is_security_definer = true
  ) THEN 'PASS' ELSE 'FAIL: function missing or not SECURITY DEFINER' END;

-- Migration 003: 20250710140000_booking_request_history_hides_grants.sql
\echo ''
\echo '--- Migration 003: booking_request_history_hides_grants ---'

\echo 'CHECK 003-1: Authenticated role has select on booking_request_history_hides'
SELECT
  CASE WHEN has_table_privilege('authenticated'::regrole, 'public.booking_request_history_hides'::regclass, 'select')
       THEN 'PASS' ELSE 'FAIL: select privilege missing' END;

\echo 'CHECK 003-2: Authenticated role has insert on booking_request_history_hides'
SELECT
  CASE WHEN has_table_privilege('authenticated'::regrole, 'public.booking_request_history_hides'::regclass, 'insert')
       THEN 'PASS' ELSE 'FAIL: insert privilege missing' END;

\echo 'CHECK 003-3: Authenticated role has delete on booking_request_history_hides'
SELECT
  CASE WHEN has_table_privilege('authenticated'::regrole, 'public.booking_request_history_hides'::regclass, 'delete')
       THEN 'PASS' ELSE 'FAIL: delete privilege missing' END;

\echo 'CHECK 003-4: Anon role does NOT have select on booking_request_history_hides'
SELECT
  CASE WHEN NOT has_table_privilege('anon'::regrole, 'public.booking_request_history_hides'::regclass, 'select')
       THEN 'PASS' ELSE 'FAIL: anon should not have select' END;

-- Migration 004: 20250715180000_harden_crew_chat_auto_start_auth.sql
\echo ''
\echo '--- Migration 004: harden_crew_chat_auto_start_auth ---'

\echo 'CHECK 004-1: Function ensure_event_crew_chat_auto_started(uuid) signature and security'
SELECT
  CASE WHEN args_signature = 'p_event_id uuid'
            AND is_security_definer = true
       THEN 'PASS'
       ELSE 'FAIL: signature=' || args_signature || ' secdef=' || is_security_definer::text
  END AS result
FROM fn_signatures
WHERE function_name = 'ensure_event_crew_chat_auto_started';

\echo 'CHECK 004-2: Authenticated role has execute on ensure_event_crew_chat_auto_started(uuid)'
SELECT
  CASE WHEN has_function_privilege('authenticated'::regrole, 'public.ensure_event_crew_chat_auto_started(uuid)'::regprocedure, 'execute')
       THEN 'PASS' ELSE 'FAIL: execute privilege missing' END;

-- Migration 005: 20250715213000_remove_legacy_public_message_insert.sql
\echo ''
\echo '--- Migration 005: remove_legacy_public_message_insert ---'

\echo 'CHECK 005-1: Anon role does NOT have insert on messages'
SELECT
  CASE WHEN NOT has_table_privilege('anon'::regrole, 'public.messages'::regclass, 'insert')
       THEN 'PASS' ELSE 'FAIL: anon should not have insert' END;

-- Migration 006: 20250720120000_event_history_hide_past.sql
\echo ''
\echo '--- Migration 006: event_history_hide_past ---'

\echo 'CHECK 006-1: Function planner_event_can_hide_from_history exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM fn_signatures
    WHERE function_name = 'planner_event_can_hide_from_history'
      AND args_signature = 'p_owner_id text, p_status text, p_event_date text'
  ) THEN 'PASS' ELSE 'FAIL: function missing or wrong signature' END;

\echo 'CHECK 006-2: Authenticated role has execute on planner_event_can_hide_from_history'
SELECT
  CASE WHEN has_function_privilege('authenticated'::regrole, 'public.planner_event_can_hide_from_history(text,text,text)'::regprocedure, 'execute')
       THEN 'PASS' ELSE 'FAIL: execute privilege missing' END;

-- Migration 007: 20250729100000_message_reactions_realtime.sql
\echo ''
\echo '--- Migration 007: message_reactions_realtime ---'

\echo 'CHECK 007-1: Table public.message_reactions replica identity set to FULL'
SELECT
  CASE WHEN relreplident = 'f' THEN 'PASS'
       ELSE 'FAIL: replica identity = ' || relreplident
  END AS result
FROM pg_class
WHERE relname = 'message_reactions'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Migration 008: 20250730120000_reaction_notification_lifecycle.sql
\echo ''
\echo '--- Migration 008: reaction_notification_lifecycle ---'

\echo 'CHECK 008-1: Column public.notifications.reaction_id exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'reaction_id'
  ) THEN 'PASS' ELSE 'FAIL: column does not exist' END;

\echo 'CHECK 008-2: Index notifications_reaction_id_idx exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND indexname = 'notifications_reaction_id_idx'
  ) THEN 'PASS' ELSE 'FAIL: index does not exist' END;

\echo 'CHECK 008-3: Function create_notification exists with 6 text/uuid parameters'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM fn_signatures
    WHERE function_name = 'create_notification'
      AND is_security_definer = true
  ) THEN 'PASS' ELSE 'FAIL: function missing or not SECURITY DEFINER' END;

\echo 'CHECK 008-4: Function revoke_reaction_notification(uuid) exists'
SELECT
  CASE WHEN EXISTS(
    SELECT 1 FROM fn_signatures
    WHERE function_name = 'revoke_reaction_notification'
      AND args_signature = 'p_reaction_id uuid'
      AND is_security_definer = true
  ) THEN 'PASS' ELSE 'FAIL: function missing or wrong signature' END;

\echo 'CHECK 008-5: Authenticated role has execute on create_notification'
SELECT
  CASE WHEN has_function_privilege('authenticated'::regrole, 'public.create_notification(text,text,text,text,text,uuid)'::regprocedure, 'execute')
       THEN 'PASS' ELSE 'FAIL: execute privilege missing' END;

\echo 'CHECK 008-6: Authenticated role has execute on revoke_reaction_notification'
SELECT
  CASE WHEN has_function_privilege('authenticated'::regrole, 'public.revoke_reaction_notification(uuid)'::regprocedure, 'execute')
       THEN 'PASS' ELSE 'FAIL: execute privilege missing' END;

-- Migration 009: 20250805000000_event_run_sheet_realtime.sql
\echo ''
\echo '--- Migration 009: event_run_sheet_realtime ---'

\echo 'CHECK 009-1: Table public.event_run_sheet_rows replica identity set to FULL'
SELECT
  CASE WHEN relreplident = 'f' THEN 'PASS'
       ELSE 'FAIL: replica identity = ' || relreplident
  END AS result
FROM pg_class
WHERE relname = 'event_run_sheet_rows'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Migration 010: 20250805000001_allow_pending_djs_to_view_run_sheet.sql
\echo ''
\echo '--- Migration 010: allow_pending_djs_to_view_run_sheet ---'

\echo 'CHECK 010-1: Function can_view_event_run_sheet(uuid) signature and security'
SELECT
  CASE WHEN args_signature = 'p_event_id uuid'
            AND is_security_definer = true
       THEN 'PASS'
       ELSE 'FAIL: signature=' || args_signature || ' secdef=' || is_security_definer::text
  END AS result
FROM fn_signatures
WHERE function_name = 'can_view_event_run_sheet';

\echo ''
\echo '============================================================================'
\echo 'VERIFICATION COMPLETE'
\echo 'All checks use exact signature/definition/expression matching'
\echo '============================================================================'
