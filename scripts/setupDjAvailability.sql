-- Run this entire block in Supabase SQL Editor.
-- Creates dj_availability, grants, RLS policies, and reloads PostgREST schema.

create table if not exists public.dj_availability (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  date text not null,
  status text not null,
  notes text not null default ''
);

alter table public.dj_availability
  drop constraint if exists dj_availability_status_check;

alter table public.dj_availability
  add constraint dj_availability_status_check
  check (status in ('available', 'unavailable', 'tentative'));

create unique index if not exists dj_availability_user_id_date_idx
  on public.dj_availability (user_id, date);

create index if not exists dj_availability_date_idx
  on public.dj_availability (date);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.dj_availability to authenticated;

alter table public.dj_availability enable row level security;

drop policy if exists "Authenticated users can read dj_availability" on public.dj_availability;
drop policy if exists "Users can insert own dj_availability" on public.dj_availability;
drop policy if exists "Users can update own dj_availability" on public.dj_availability;
drop policy if exists "Users can delete own dj_availability" on public.dj_availability;

create policy "Authenticated users can read dj_availability"
  on public.dj_availability
  for select
  to authenticated
  using (true);

create policy "Users can insert own dj_availability"
  on public.dj_availability
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);

create policy "Users can update own dj_availability"
  on public.dj_availability
  for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy "Users can delete own dj_availability"
  on public.dj_availability
  for delete
  to authenticated
  using (user_id = auth.uid()::text);

notify pgrst, 'reload schema';
