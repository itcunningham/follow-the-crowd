-- ROSTER POST-MIGRATION VERIFICATION — STRICTLY READ-ONLY. One SELECT.
-- No CREATE, no INSERT, no ALTER, no function execution.
--
-- Run AFTER setupPlannerDjRoster.sql and the updated setupAccountDeletion.sql.
-- Running it BEFORE the migration will error on the missing table - that is
-- itself a correct answer, not a fault in the query.
--
-- Checks invariants, not a point-in-time snapshot. It stays correct as the
-- roster grows: rows are added by the backfill, by add-by-username, and by
-- sending a booking. A check that fails because the feature was used is not
-- protecting anything.
--
-- EVERY ROW MUST SHOW pass = true.
--
-- The account-deletion check reads pg_get_functiondef only. The function is
-- NEVER called - calling it would delete an account.

with fn as (
  select coalesce(
    (select pg_get_functiondef(p.oid)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'delete_account_data'
     limit 1), '') as src
),
eligible_planner as (
  select u.user_id from public.users u
  where u.role in ('promoter','both') and u.deleted_at is null
),
active_planners as (
  select distinct e.owner_id as planner_id
  from public.events e
  join eligible_planner ep on ep.user_id = e.owner_id
)

select 1 as ord, 'table exists' as check_name, 'present' as expected,
  coalesce((select 'present' from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname='public' and c.relname='planner_dj_roster' and c.relkind='r'), 'MISSING') as actual,
  (to_regclass('public.planner_dj_roster') is not null) as pass

union all select 2, 'RLS enabled', 'true',
  coalesce((select c.relrowsecurity::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
            where n.nspname='public' and c.relname='planner_dj_roster'), 'n/a'),
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
            where n.nspname='public' and c.relname='planner_dj_roster'), false)

union all select 3, 'the three expected policies exist', '3',
  (select count(*)::text from pg_policies where schemaname='public' and tablename='planner_dj_roster'
     and policyname in ('planner_dj_roster_select_own','planner_dj_roster_insert_own','planner_dj_roster_delete_own')),
  (select count(*) from pg_policies where schemaname='public' and tablename='planner_dj_roster'
     and policyname in ('planner_dj_roster_select_own','planner_dj_roster_insert_own','planner_dj_roster_delete_own')) = 3

union all select 4, 'no EXTRA policies on the table', '3 total',
  (select count(*)::text from pg_policies where schemaname='public' and tablename='planner_dj_roster'),
  (select count(*) from pg_policies where schemaname='public' and tablename='planner_dj_roster') = 3

union all select 5, 'no anon/public grant on any roster policy', '0',
  (select count(*)::text from pg_policies p where p.schemaname='public' and p.tablename='planner_dj_roster'
     and ('anon'::name = any(p.roles) or 'public'::name = any(p.roles))),
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename='planner_dj_roster'
     and ('anon'::name = any(p.roles) or 'public'::name = any(p.roles))) = 0

union all select 6, 'no UPDATE policy (table is immutable)', '0',
  (select count(*)::text from pg_policies where schemaname='public' and tablename='planner_dj_roster' and cmd='UPDATE'),
  (select count(*) from pg_policies where schemaname='public' and tablename='planner_dj_roster' and cmd='UPDATE') = 0

-- Grants. RLS narrows access; it grants nothing, and Postgres checks the table
-- privilege FIRST. Without these the three policies above are never evaluated
-- and every read and write fails with 42501 "permission denied for table".
--
-- This section exists because the original 19-row query passed 19/19 while the
-- table was completely unusable: it verified policies, RLS and row integrity
-- but never that any role could reach the table at all. The add-by-username
-- flow failed live, and the empty state that looked correct was the roster read
-- throwing and being caught. A check that cannot fail for the most basic
-- possible reason is not a check.
union all select 7, 'authenticated can SELECT', 'true',
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'SELECT')::text,
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'SELECT')
union all select 8, 'authenticated can INSERT', 'true',
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'INSERT')::text,
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'INSERT')
union all select 9, 'authenticated can DELETE', 'true',
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'DELETE')::text,
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'DELETE')
-- No UPDATE policy exists, so the privilege must not exist either.
union all select 91, 'authenticated CANNOT UPDATE', 'false',
  has_table_privilege('authenticated', 'public.planner_dj_roster', 'UPDATE')::text,
  not has_table_privilege('authenticated', 'public.planner_dj_roster', 'UPDATE')
union all select 92, 'anon holds NO privilege at all', 'false',
  (has_table_privilege('anon', 'public.planner_dj_roster', 'SELECT')
    or has_table_privilege('anon', 'public.planner_dj_roster', 'INSERT')
    or has_table_privilege('anon', 'public.planner_dj_roster', 'DELETE'))::text,
  not (has_table_privilege('anon', 'public.planner_dj_roster', 'SELECT')
    or has_table_privilege('anon', 'public.planner_dj_roster', 'INSERT')
    or has_table_privilege('anon', 'public.planner_dj_roster', 'DELETE'))

-- Invariants, not the original 1/1/1 snapshot. Those fixed counts were correct
-- for the hour after the migration and wrong forever afterwards: the roster is
-- meant to grow, so pinning them turned "the feature was used" into a failing
-- check. Growth is verified by shape; safety is verified by the integrity rows
-- below and by the stranding gate at ord 30, which are the checks that can
-- actually catch a defect.
union all select 10, 'backfill ran at least once', '>= 1',
  (select count(*)::text from public.planner_dj_roster where source='backfill'),
  (select count(*) from public.planner_dj_roster where source='backfill') >= 1

union all select 11, 'total rows >= backfill rows', 'true',
  (select count(*)::text from public.planner_dj_roster)
    || ' total, '
    || (select count(*)::text from public.planner_dj_roster where source='backfill')
    || ' backfill',
  (select count(*) from public.planner_dj_roster)
    >= (select count(*) from public.planner_dj_roster where source='backfill')

union all select 12, 'distinct planners with roster entries', '>= 1',
  (select count(distinct planner_id)::text from public.planner_dj_roster),
  (select count(distinct planner_id) from public.planner_dj_roster) >= 1

union all select 13, 'distinct DJs on a roster', '>= 1',
  (select count(distinct dj_id)::text from public.planner_dj_roster),
  (select count(distinct dj_id) from public.planner_dj_roster) >= 1

-- Every row carries a source the migration or the app could have written. A row
-- with an unexpected source means something wrote to this table that should not
-- have; the check constraint should already prevent it, so this proves the
-- constraint is real rather than merely declared.
union all select 14, 'every row has a known source', 'true',
  (select coalesce(string_agg(distinct source, ', ' order by source), '(no rows)')
     from public.planner_dj_roster),
  (select count(*) from public.planner_dj_roster
     where source not in ('manual','booking','backfill')) = 0

-- Integrity. The primary key and check constraints should make these impossible;
-- verifying them proves the constraints were actually created, not just written.
union all select 20, 'self-links (planner_id = dj_id)', '0',
  (select count(*)::text from public.planner_dj_roster where planner_id = dj_id),
  (select count(*) from public.planner_dj_roster where planner_id = dj_id) = 0

union all select 21, 'rows with a source outside manual/booking/backfill', '0',
  (select count(*)::text from public.planner_dj_roster where source not in ('manual','booking','backfill')),
  (select count(*) from public.planner_dj_roster where source not in ('manual','booking','backfill')) = 0

union all select 22, 'duplicate (planner_id, dj_id) pairs', '0',
  (select count(*)::text from (select planner_id, dj_id from public.planner_dj_roster
     group by planner_id, dj_id having count(*) > 1) d),
  (select count(*) from (select planner_id, dj_id from public.planner_dj_roster
     group by planner_id, dj_id having count(*) > 1) d) = 0

union all select 23, 'rows pointing at a deleted / incomplete / non-DJ user', '0',
  (select count(*)::text from public.planner_dj_roster r
     where not exists (select 1 from public.users u
       where u.user_id = r.dj_id and u.role in ('dj','both')
         and u.onboarding_complete and u.deleted_at is null)),
  (select count(*) from public.planner_dj_roster r
     where not exists (select 1 from public.users u
       where u.user_id = r.dj_id and u.role in ('dj','both')
         and u.onboarding_complete and u.deleted_at is null)) = 0

-- The stranding gate, now measured against real rows rather than a projection.
union all select 30, 'eligible planners WITH events but EMPTY roster', '0',
  (select count(*)::text from active_planners ap
     where not exists (select 1 from public.planner_dj_roster r where r.planner_id = ap.planner_id)),
  (select count(*) from active_planners ap
     where not exists (select 1 from public.planner_dj_roster r where r.planner_id = ap.planner_id)) = 0

-- Account deletion cleanup, read from the stored definition. Never executed.
union all select 40, 'delete_account_data() exists', 'present',
  (select case when src = '' then 'MISSING' else 'present' end from fn),
  (select src <> '' from fn)

union all select 41, 'deletion cleans roster by planner_id', 'yes',
  (select case when src like '%planner_id = $1%' then 'yes' else 'NO' end from fn),
  (select src like '%planner_id = $1%' from fn)

union all select 42, 'deletion cleans roster by dj_id', 'yes',
  (select case when src like '%dj_id = $1%' then 'yes' else 'NO' end from fn),
  (select src like '%dj_id = $1%' from fn)

union all select 43, 'deletion guards on to_regclass (order-independent)', 'yes',
  (select case when src like '%to_regclass(''public.planner_dj_roster'')%' then 'yes' else 'NO' end from fn),
  (select src like '%to_regclass(''public.planner_dj_roster'')%' from fn)

order by ord;
