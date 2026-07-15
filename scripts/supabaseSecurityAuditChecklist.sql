-- Read-only live Supabase RLS/security audit checklist for Follow The Crowd.
-- Paste into Supabase SQL Editor and run as-is.
-- This script does not modify data, schema, policies, or storage.
-- Each result row: check_name, expected, actual, pass (true/false).

with policy_names as (
  select tablename, policyname, roles, roles::text as roles_text, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
),
storage_policy_names as (
  select policyname, roles::text as roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
),
checks as (
  select 1 as ord, 'messages_select_event_authenticated absent' as check_name,
    'absent' as expected,
    case when exists (
      select 1 from policy_names where tablename = 'messages' and policyname = 'messages_select_event_authenticated'
    ) then 'present' else 'absent' end as actual

  union all select 2, 'messages_select_event_crew present', 'present',
    case when exists (
      select 1 from policy_names where tablename = 'messages' and policyname = 'messages_select_event_crew'
    ) then 'present' else 'absent' end

  union all select 3, 'messages_insert_event_crew present (not legacy sender)', 'present',
    case when exists (
      select 1 from policy_names where tablename = 'messages' and policyname = 'messages_insert_event_crew'
    ) then 'present' else 'absent' end

  union all select 4, 'crew select uses is_event_crew_member_for_message', 'uses helper',
    case when exists (
      select 1 from policy_names
      where tablename = 'messages' and policyname = 'messages_select_event_crew'
        and coalesce(qual, '') like '%is_event_crew_member_for_message%'
    ) then 'uses helper' else 'missing helper' end

  union all select 5, 'profile-images no anon/public write', 'no public write',
    case when exists (
      select 1 from storage_policy_names
      where policyname in ('Anon upload profile images', 'Anon update profile images')
         or (roles like '%public%' and cmd in ('INSERT', 'UPDATE', 'ALL')
             and policyname ilike '%profile%')
    ) then 'legacy public write found' else 'no public write' end

  union all select 6, 'event-covers write uses can_manage_event_cover_storage', 'uses helper',
    case when exists (
      select 1 from storage_policy_names
      where policyname in ('event_covers_insert_own_folder', 'event_covers_update_own_folder', 'event_covers_delete_own_folder')
        and coalesce(with_check, qual, '') like '%can_manage_event_cover_storage%'
    ) then 'uses helper' else 'missing helper' end

  union all select 7, 'dm-attachments insert requires conversation membership', 'uses is_conversation_member',
    case when exists (
      select 1 from storage_policy_names
      where policyname = 'dm_attachments_insert_member'
        and coalesce(with_check, '') like '%is_conversation_member%'
    ) then 'uses is_conversation_member' else 'missing membership check' end

  union all select 8, 'notifications direct insert revoked from authenticated', 'no insert grant',
    case when has_table_privilege('authenticated', 'public.notifications', 'INSERT')
      then 'insert still granted' else 'no insert grant' end

  union all select 9, 'create_notification RPC callable by authenticated', 'callable',
    case when has_function_privilege('authenticated', 'public.create_notification(text, text, text, text, text)', 'EXECUTE')
      then 'callable' else 'not callable' end

  union all select 10, 'booking_requests participant-only select', 'participant policy',
    case when exists (
      select 1 from policy_names
      where tablename = 'booking_requests' and policyname = 'booking_requests_select_participant'
        and coalesce(qual, '') like '%sender_id%'
        and coalesce(qual, '') like '%recipient_id%'
    ) then 'participant policy' else 'missing/wrong policy' end

  union all select 11, 'events owner or invited DJ select', 'owner_or_invited policy',
    case when exists (
      select 1 from policy_names
      where tablename = 'events' and policyname = 'events_select_owner_or_invited'
    ) then 'owner_or_invited policy' else 'missing policy' end

  union all select 12, 'no public or anon write policies on core tables', 'no public/anon write',
    case when exists (
      select 1 from policy_names
      where tablename in ('messages', 'booking_requests', 'notifications', 'events', 'conversations', 'conversation_members')
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        and (
          'public'::name = any (roles)
          or 'anon'::name = any (roles)
        )
    ) then 'public/anon write found' else 'no public/anon write' end

  union all select 13, 'message_attachments membership policies present', 'present',
    case when exists (
      select 1 from policy_names where tablename = 'message_attachments' and policyname = 'message_attachments_select_member'
    ) and exists (
      select 1 from policy_names where tablename = 'message_attachments' and policyname = 'message_attachments_insert_uploader'
    ) then 'present' else 'absent' end

  union all select 14, 'messages_update hardened (own or booking participant)', 'hardened',
    case when exists (
      select 1 from policy_names
      where tablename = 'messages' and policyname = 'messages_update_conversation_member'
        and coalesce(qual, '') like '%BOOKING REQUEST%'
    ) then 'hardened' else 'legacy broad update' end

  union all select 15, 'helper RPCs not directly callable', 'revoked',
    case when has_function_privilege('authenticated', 'public.are_users_dm_blocked(text, text)', 'EXECUTE')
        or has_function_privilege('authenticated', 'public.is_event_crew_participant(uuid, text)', 'EXECUTE')
      then 'still callable' else 'revoked' end

  union all select 16, 'ensure_event_crew_chat_auto_started participant-only', 'participant check',
    case when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'ensure_event_crew_chat_auto_started'
        and pg_get_functiondef(p.oid) like '%is_event_crew_participant%'
        and pg_get_functiondef(p.oid) like '%auth_user_id%'
    ) and has_function_privilege('authenticated', 'public.ensure_event_crew_chat_auto_started(uuid)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.ensure_event_crew_chat_auto_started(uuid)', 'EXECUTE')
      then 'participant check' else 'missing auth or callable by anon' end
)
select
  check_name,
  expected,
  actual,
  (expected = actual) as pass
from checks
order by ord;
