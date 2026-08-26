-- Production Diagnostic: Catalog State for Migrations 001, 004, 006, 008
-- SELECT-only; safe to run; returns actual PostgreSQL catalog values
-- No syntax errors; handles missing objects gracefully

-- Migration 006: planner_event_can_hide_from_history
select 'planner_event_can_hide_from_history' as check_item,
  case when count(*) = 0 then 'MISSING' else count(*) || ' overload(s)' end as status,
  string_agg(pg_get_function_identity_arguments(oid), ' | ') as signatures_found,
  string_agg(pg_get_function_result(oid), ' | ') as return_types
from pg_proc
where proname = 'planner_event_can_hide_from_history'
  and pronamespace = 'public'::regnamespace

union all

-- Migration 006: hide_event_from_history(uuid) full definition
select 'hide_event_from_history(uuid)',
  case when count(*) = 0 then 'MISSING' else 'EXISTS' end,
  null::text,
  (array_agg(pg_get_functiondef(oid)))[1]
from pg_proc
where proname = 'hide_event_from_history'
  and pronamespace = 'public'::regnamespace
  and pg_get_function_identity_arguments(oid) = 'p_event_id uuid'

union all

-- Migration 006: hide_events_from_history(uuid[]) full definition
select 'hide_events_from_history(uuid[])',
  case when count(*) = 0 then 'MISSING' else 'EXISTS' end,
  null::text,
  (array_agg(pg_get_functiondef(oid)))[1]
from pg_proc
where proname = 'hide_events_from_history'
  and pronamespace = 'public'::regnamespace
  and pg_get_function_identity_arguments(oid) = 'p_event_ids uuid[]'

union all

-- Migration 004: ensure_event_crew_chat_auto_started(uuid) signature & security
-- Uses LEFT JOIN to always return exactly one row, even when function is missing
select
  'ensure_event_crew_chat_auto_started(uuid)' as check_item,
  case
    when p.oid is null then 'MISSING'
    else pg_get_function_result(p.oid) || ' [' || case when p.prosecdef then 'SECURITY DEFINER' else 'STABLE' end || ']'
  end as status,
  null::text as signatures_found,
  case
    when p.oid is null then '(function not found)'
    else pg_get_functiondef(p.oid)
  end as return_types
from (select 1) dummy
left join (
  select oid, prosecdef
  from pg_proc
  where proname = 'ensure_event_crew_chat_auto_started'
    and pronamespace = 'public'::regnamespace
    and pg_get_function_identity_arguments(oid) = 'p_event_id uuid'
  limit 1
) p on true

union all

-- Migration 008: create_notification - all overloads with arguments
select 'create_notification-' || pg_get_function_identity_arguments(oid) as check_item,
  pg_get_function_result(oid) as status,
  pg_get_function_arguments(oid) as signatures_found,
  substring(pg_get_functiondef(oid), 1, 400) || '...' as return_types
from pg_proc
where proname = 'create_notification'
  and pronamespace = 'public'::regnamespace

union all

-- Migration 001: events_owner_cancelled_visible_history_idx full definition
select 'events_owner_cancelled_visible_history_idx',
  'INDEX',
  null::text,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'events'
  and indexname = 'events_owner_cancelled_visible_history_idx'

order by check_item;
