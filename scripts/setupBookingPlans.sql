-- Run in Supabase SQL Editor.
-- Creates booking_plans table and dev RLS policies.

create table if not exists public.booking_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id text not null,
  name text not null,
  event_name text not null,
  venue text not null,
  event_date text not null,
  set_time text not null,
  fee text not null,
  notes text not null default ''
);

create index if not exists booking_plans_owner_id_idx
  on public.booking_plans (owner_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.booking_plans to anon, authenticated;

alter table public.booking_plans enable row level security;

drop policy if exists "Allow anon select booking_plans" on public.booking_plans;
drop policy if exists "Allow anon insert booking_plans" on public.booking_plans;
drop policy if exists "Allow anon update booking_plans" on public.booking_plans;

create policy "Allow anon select booking_plans"
  on public.booking_plans
  for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert booking_plans"
  on public.booking_plans
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update booking_plans"
  on public.booking_plans
  for update
  to anon, authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
