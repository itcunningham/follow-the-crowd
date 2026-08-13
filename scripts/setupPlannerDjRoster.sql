-- Follow The Crowd — private planner→DJ roster
-- Run in Supabase SQL Editor. Idempotent: safe to re-run.
--
-- DEPENDS ON: public.auth_user_id() (setupProductionRls.sql) and
--             public.users.deleted_at (setupAccountDeletion.sql).
--
-- SCOPE OF THIS FILE: table, policies, backfill. Nothing reads this table yet.
-- The application still calls listBookableDjs() and still shows every DJ; the
-- roster only starts affecting what planners see when the code-level flag is
-- flipped, which is a separate reviewed commit. Applying this file changes no
-- user-visible behaviour.
--
-- NOT A SECURITY BOUNDARY. users_select_authenticated already lets any
-- authenticated account read every row in public.users, so this table curates
-- what a planner is *shown*; it does not make a DJ list secret.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.planner_dj_roster (
  planner_id  text        not null,
  dj_id       text        not null,
  source      text        not null default 'manual',
  created_at  timestamptz not null default now(),
  primary key (planner_id, dj_id)
);

-- No foreign key to public.users, deliberately. Accounts are SOFT-deleted -
-- delete_account_data() anonymises the profile row and only hard-deletes
-- auth.users - so ON DELETE CASCADE would never fire and would read as
-- protection that does not exist. No other table in this schema references
-- public.users either. Cleanup lives in delete_account_data() instead.

alter table public.planner_dj_roster
  drop constraint if exists planner_dj_roster_no_self;

alter table public.planner_dj_roster
  add constraint planner_dj_roster_no_self check (planner_id <> dj_id);

alter table public.planner_dj_roster
  drop constraint if exists planner_dj_roster_source_check;

alter table public.planner_dj_roster
  add constraint planner_dj_roster_source_check
  check (source in ('manual', 'booking', 'backfill'));

create index if not exists planner_dj_roster_planner_idx
  on public.planner_dj_roster (planner_id);

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
-- RLS narrows what a role may reach; it grants nothing. Postgres checks the
-- table privilege FIRST, so without this the policies below are never even
-- evaluated and every read and write fails with 42501 "permission denied for
-- table" — which is why omitting this looked like an RLS bug rather than a
-- missing grant.
--
-- This project does not rely on Supabase's default privileges: `anon` holds no
-- SELECT on messages, conversations or booking_plans, so a new table starts
-- with nothing. Every other setup script grants explicitly for the same reason.
--
-- authenticated only, and no UPDATE: there is no update policy, and granting a
-- privilege no policy admits is surface for nothing.

grant select, insert, delete on table public.planner_dj_roster to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — planner-only, three policies
-- ---------------------------------------------------------------------------
-- Dropped and re-created here so THIS file is the single owner of these policy
-- names and a re-run is idempotent. Do not add these names to the drop list in
-- setupProductionRls.sql: that file drops without re-creating them, so a run of
-- it would silently delete them.

alter table public.planner_dj_roster enable row level security;

drop policy if exists "planner_dj_roster_select_own" on public.planner_dj_roster;
drop policy if exists "planner_dj_roster_insert_own" on public.planner_dj_roster;
drop policy if exists "planner_dj_roster_delete_own" on public.planner_dj_roster;

-- Read: the owning planner only. A DJ deliberately cannot see which planners
-- have rostered them - no UI needs the reverse direction, and leaving it out
-- keeps the surface smaller.
create policy "planner_dj_roster_select_own"
  on public.planner_dj_roster
  for select
  to authenticated
  using (planner_id = public.auth_user_id());

-- Write: you may only add rows to your own roster. That dj_id is genuinely a DJ
-- is enforced in the client query, not here: a subquery in with_check would cost
-- on every insert, and the worst case of a stray row is one non-DJ appearing in
-- its own planner's picker, deletable by them.
create policy "planner_dj_roster_insert_own"
  on public.planner_dj_roster
  for insert
  to authenticated
  with check (planner_id = public.auth_user_id());

create policy "planner_dj_roster_delete_own"
  on public.planner_dj_roster
  for delete
  to authenticated
  using (planner_id = public.auth_user_id());

-- No update policy: nothing on this table is mutable.

-- ---------------------------------------------------------------------------
-- Backfill from historical booking relationships
-- ---------------------------------------------------------------------------
-- Every planner who has ever sent a booking starts with a populated roster, so
-- only a genuinely new planner ever sees the empty state.
--
-- Uses only sender_id / recipient_id, present since the base booking_requests
-- table, so this does not depend on any later migration.
--
-- Idempotent via the primary key. Reversible with:
--   delete from public.planner_dj_roster where source = 'backfill';

insert into public.planner_dj_roster (planner_id, dj_id, source)
select distinct
  br.sender_id,
  br.recipient_id,
  'backfill'
from public.booking_requests br
join public.users p
  on p.user_id = br.sender_id
 and p.role in ('promoter', 'both')
 and p.deleted_at is null
join public.users d
  on d.user_id = br.recipient_id
 and d.role in ('dj', 'both')
 and d.onboarding_complete
 and d.deleted_at is null
 and coalesce(btrim(d.display_name), '') <> ''
where br.sender_id <> br.recipient_id
on conflict (planner_id, dj_id) do nothing;
