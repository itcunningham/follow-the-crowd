-- Run in Supabase SQL Editor.
-- Creates public.events, links booking_requests.event_id, and applies production RLS.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- public.events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id text not null,
  booking_plan_id uuid references public.booking_plans (id) on delete set null,
  name text not null,
  venue text not null,
  event_date text not null,
  set_time text not null,
  rate text not null default '',
  notes text not null default '',
  status text not null default 'draft',
  crew_chat_started_at timestamptz
);

alter table public.events
  add column if not exists crew_chat_started_at timestamptz;

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('draft', 'upcoming', 'completed', 'cancelled'));

create index if not exists events_owner_id_idx
  on public.events (owner_id);

create index if not exists events_booking_plan_id_idx
  on public.events (booking_plan_id);

-- ---------------------------------------------------------------------------
-- public.booking_requests.event_id
-- ---------------------------------------------------------------------------

alter table public.booking_requests
  add column if not exists event_id uuid references public.events (id) on delete set null;

create index if not exists booking_requests_event_id_idx
  on public.booking_requests (event_id);

-- ---------------------------------------------------------------------------
-- Grants (production: authenticated only)
-- ---------------------------------------------------------------------------

revoke all on table public.events from anon;
grant select, insert, update, delete on table public.events to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: public.events
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;

drop policy if exists "Allow anon select events" on public.events;
drop policy if exists "Allow anon insert events" on public.events;
drop policy if exists "Allow anon update events" on public.events;
drop policy if exists "events_select_owner_or_invited" on public.events;
drop policy if exists "events_insert_owner" on public.events;
drop policy if exists "events_update_owner" on public.events;
drop policy if exists "events_delete_owner" on public.events;

create policy "events_select_owner_or_invited"
  on public.events
  for select
  to authenticated
  using (
    owner_id = public.auth_user_id()
    or exists (
      select 1
      from public.booking_requests br
      where br.event_id = events.id
        and br.recipient_id = public.auth_user_id()
    )
  );

create policy "events_insert_owner"
  on public.events
  for insert
  to authenticated
  with check (
    owner_id = public.auth_user_id()
    and (
      booking_plan_id is null
      or exists (
        select 1
        from public.booking_plans bp
        where bp.id = booking_plan_id
          and bp.owner_id = public.auth_user_id()
      )
    )
  );

create policy "events_update_owner"
  on public.events
  for update
  to authenticated
  using (owner_id = public.auth_user_id())
  with check (
    owner_id = public.auth_user_id()
    and (
      booking_plan_id is null
      or exists (
        select 1
        from public.booking_plans bp
        where bp.id = booking_plan_id
          and bp.owner_id = public.auth_user_id()
      )
    )
  );

create policy "events_delete_owner"
  on public.events
  for delete
  to authenticated
  using (owner_id = public.auth_user_id());

notify pgrst, 'reload schema';
