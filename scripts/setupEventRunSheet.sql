-- Run in Supabase SQL Editor.
-- Creates event run sheet tables and production RLS.
-- Idempotent: safe to re-run.
-- Prerequisites: setupProductionRls.sql, setupEvents.sql

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_event_run_sheet_owner(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.owner_id = public.auth_user_id()
  );
$$;

create or replace function public.can_view_event_run_sheet(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_event_run_sheet_owner(p_event_id)
    or public.is_event_crew_participant(p_event_id, public.auth_user_id());
$$;

revoke all on function public.is_event_run_sheet_owner(uuid) from public;
revoke all on function public.can_view_event_run_sheet(uuid) from public;
grant execute on function public.is_event_run_sheet_owner(uuid) to authenticated;
grant execute on function public.can_view_event_run_sheet(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- public.event_run_sheet_columns
-- ---------------------------------------------------------------------------

create table if not exists public.event_run_sheet_columns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  owner_id text not null,
  name text not null,
  sort_order integer not null default 0
);

create index if not exists event_run_sheet_columns_event_id_idx
  on public.event_run_sheet_columns (event_id);

-- ---------------------------------------------------------------------------
-- public.event_run_sheet_rows
-- ---------------------------------------------------------------------------

create table if not exists public.event_run_sheet_rows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  owner_id text not null,
  sort_order integer not null default 0,
  artist_name text not null default '',
  start_time text not null default '',
  finish_time text not null default '',
  stage_area text not null default '',
  notes text not null default '',
  custom_data jsonb not null default '{}'::jsonb
);

create index if not exists event_run_sheet_rows_event_id_idx
  on public.event_run_sheet_rows (event_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on table public.event_run_sheet_columns from anon;
revoke all on table public.event_run_sheet_rows from anon;
grant select, insert, update, delete on table public.event_run_sheet_columns to authenticated;
grant select, insert, update, delete on table public.event_run_sheet_rows to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: event_run_sheet_columns
-- ---------------------------------------------------------------------------

alter table public.event_run_sheet_columns enable row level security;

drop policy if exists "event_run_sheet_columns_select_viewer" on public.event_run_sheet_columns;
drop policy if exists "event_run_sheet_columns_insert_owner" on public.event_run_sheet_columns;
drop policy if exists "event_run_sheet_columns_update_owner" on public.event_run_sheet_columns;
drop policy if exists "event_run_sheet_columns_delete_owner" on public.event_run_sheet_columns;

create policy "event_run_sheet_columns_select_viewer"
  on public.event_run_sheet_columns
  for select
  to authenticated
  using (public.can_view_event_run_sheet(event_id));

create policy "event_run_sheet_columns_insert_owner"
  on public.event_run_sheet_columns
  for insert
  to authenticated
  with check (
    owner_id = public.auth_user_id()
    and public.is_event_run_sheet_owner(event_id)
  );

create policy "event_run_sheet_columns_update_owner"
  on public.event_run_sheet_columns
  for update
  to authenticated
  using (public.is_event_run_sheet_owner(event_id))
  with check (
    owner_id = public.auth_user_id()
    and public.is_event_run_sheet_owner(event_id)
  );

create policy "event_run_sheet_columns_delete_owner"
  on public.event_run_sheet_columns
  for delete
  to authenticated
  using (public.is_event_run_sheet_owner(event_id));

-- ---------------------------------------------------------------------------
-- RLS: event_run_sheet_rows
-- ---------------------------------------------------------------------------

alter table public.event_run_sheet_rows enable row level security;

drop policy if exists "event_run_sheet_rows_select_viewer" on public.event_run_sheet_rows;
drop policy if exists "event_run_sheet_rows_insert_owner" on public.event_run_sheet_rows;
drop policy if exists "event_run_sheet_rows_update_owner" on public.event_run_sheet_rows;
drop policy if exists "event_run_sheet_rows_delete_owner" on public.event_run_sheet_rows;

create policy "event_run_sheet_rows_select_viewer"
  on public.event_run_sheet_rows
  for select
  to authenticated
  using (public.can_view_event_run_sheet(event_id));

create policy "event_run_sheet_rows_insert_owner"
  on public.event_run_sheet_rows
  for insert
  to authenticated
  with check (
    owner_id = public.auth_user_id()
    and public.is_event_run_sheet_owner(event_id)
  );

create policy "event_run_sheet_rows_update_owner"
  on public.event_run_sheet_rows
  for update
  to authenticated
  using (public.is_event_run_sheet_owner(event_id))
  with check (
    owner_id = public.auth_user_id()
    and public.is_event_run_sheet_owner(event_id)
  );

create policy "event_run_sheet_rows_delete_owner"
  on public.event_run_sheet_rows
  for delete
  to authenticated
  using (public.is_event_run_sheet_owner(event_id));

notify pgrst, 'reload schema';
