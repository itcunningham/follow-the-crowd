-- Run this entire block in Supabase SQL Editor.
-- Creates booking_requests, grants, RLS policies, and reloads PostgREST schema.

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender_id text not null,
  recipient_id text not null,
  conversation_id uuid not null,
  event_name text not null,
  venue text not null,
  event_date text not null,
  set_time text not null,
  fee text not null,
  notes text not null default '',
  status text not null default 'pending'
);

alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('pending', 'accepted', 'declined'));

create index if not exists booking_requests_conversation_id_idx
  on public.booking_requests (conversation_id);

create index if not exists booking_requests_sender_id_idx
  on public.booking_requests (sender_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.booking_requests to anon, authenticated;

alter table public.booking_requests enable row level security;

drop policy if exists "Allow anon select booking_requests" on public.booking_requests;
drop policy if exists "Allow anon insert booking_requests" on public.booking_requests;
drop policy if exists "Allow anon update booking_requests" on public.booking_requests;

create policy "Allow anon select booking_requests"
  on public.booking_requests
  for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert booking_requests"
  on public.booking_requests
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update booking_requests"
  on public.booking_requests
  for update
  to anon, authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
