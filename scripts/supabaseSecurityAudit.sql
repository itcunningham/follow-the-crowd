-- Read-only security audit for Follow The Crowd (Supabase).
-- Run in the Supabase SQL Editor. Safe to re-run. No writes or destructive changes.

-- ---------------------------------------------------------------------------
-- 1. Public tables without Row Level Security enabled
-- ---------------------------------------------------------------------------
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'users',
    'booking_plans',
    'booking_requests',
    'notifications',
    'events',
    'conversations',
    'conversation_members',
    'messages',
    'message_reads',
    'message_attachments',
    'message_reactions',
    'dj_availability',
    'user_blocks',
    'user_reports',
    'event_run_sheet_columns',
    'event_run_sheet_rows'
  )
order by c.relname;

-- ---------------------------------------------------------------------------
-- 2. Policies on core public tables
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'users',
    'booking_plans',
    'booking_requests',
    'notifications',
    'events',
    'conversations',
    'conversation_members',
    'messages',
    'message_reads',
    'message_attachments',
    'message_reactions',
    'dj_availability',
    'user_blocks',
    'user_reports',
    'event_run_sheet_columns',
    'event_run_sheet_rows'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- 3. Storage bucket policies
-- ---------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- ---------------------------------------------------------------------------
-- 4. SECURITY DEFINER functions in public schema
-- ---------------------------------------------------------------------------
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  array_to_string(p.proacl, ', ') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- ---------------------------------------------------------------------------
-- 5. Callable RPCs granted to anon or authenticated
-- ---------------------------------------------------------------------------
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
order by p.proname;

-- ---------------------------------------------------------------------------
-- 6. Tables still granting privileges to anon (production should revoke these)
-- ---------------------------------------------------------------------------
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'users',
    'booking_plans',
    'booking_requests',
    'notifications',
    'events',
    'conversations',
    'conversation_members',
    'messages'
  )
order by table_name, privilege_type;
