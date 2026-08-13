-- Read-only verification for the private-profile-fields rollout.
-- Safe to run at any time; changes nothing.
--
-- Checks 5 and 6 (the view) are satisfied after PHASE A
--   scripts/setupPrivateProfileFieldsView.sql
-- Checks 1-4 (the grants) are satisfied only after PHASE C
--   scripts/setupPrivateProfileFieldsRevoke.sql
-- Between the two phases, checks 1-4 are EXPECTED to show the old
-- table-level grant. That is not a failure; it is the safe intermediate
-- state that keeps the deployed app working while traffic moves.

-- 1. `authenticated` must hold NO table-level SELECT on public.users, and
--    column-level SELECT on exactly 22 columns.
--    Expect: 22 rows. full_name and dj_booking_contact_name must NOT appear.
select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'users'
  and grantee = 'authenticated'
  and privilege_type = 'SELECT'
order by column_name;

-- 2. The two private columns must be absent from the list above.
--    Expect: 0 rows.
select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'users'
  and grantee = 'authenticated'
  and privilege_type = 'SELECT'
  and column_name in ('full_name', 'dj_booking_contact_name');

-- 3. No role other than the service/owner roles may hold table-level SELECT.
--    Expect: no row for `authenticated` or `anon`.
select grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'users'
order by grantee, privilege_type;

-- 4. INSERT/UPDATE must still be table-level for `authenticated` - profile
--    editing depends on it. Expect: INSERT and UPDATE present.
select privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'users'
  and grantee = 'authenticated'
order by privilege_type;

-- 5. The owner view exists, is not security_invoker, and is granted only to
--    `authenticated`. Expect: reloptions null or without security_invoker=true.
select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'my_profile';

select grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name = 'my_profile'
order by grantee, privilege_type;

-- 6. The view exposes exactly the 22 OWN_PROFILE_FIELDS columns, and full_name
--    is not one of them. Expect: 22 rows, no full_name.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'my_profile'
order by column_name;

-- 7. RLS on public.users is unchanged - this change adds a privilege layer in
--    front of RLS, it does not replace it. Expect the same three policies.
select policyname, roles::text, cmd
from pg_policies
where schemaname = 'public' and tablename = 'users'
order by policyname;
