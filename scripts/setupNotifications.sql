-- Run in Supabase SQL Editor.
-- Creates notifications table and dev RLS policies.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false
);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message', 'booking_request', 'booking_update'));

create index if not exists notifications_user_id_read_idx
  on public.notifications (user_id, read);

create index if not exists notifications_user_id_type_read_idx
  on public.notifications (user_id, type, read);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.notifications to anon, authenticated;

alter table public.notifications enable row level security;

drop policy if exists "Allow anon select notifications" on public.notifications;
drop policy if exists "Allow anon insert notifications" on public.notifications;
drop policy if exists "Allow anon update notifications" on public.notifications;

create policy "Allow anon select notifications"
  on public.notifications
  for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert notifications"
  on public.notifications
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update notifications"
  on public.notifications
  for update
  to anon, authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
