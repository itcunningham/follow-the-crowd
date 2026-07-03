-- Run in Supabase SQL Editor to support role onboarding for demo-user (and future auth users).

alter table public.users add column if not exists user_id text;
alter table public.users add column if not exists role text;
alter table public.users add column if not exists onboarding_complete boolean default false;
alter table public.users add column if not exists display_name text;

alter table public.users drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role is null or role in ('dj', 'promoter', 'both'));

create unique index if not exists users_user_id_key on public.users (user_id);

alter table public.users enable row level security;

drop policy if exists "Allow public read users" on public.users;
drop policy if exists "Allow public upsert users" on public.users;

create policy "Allow public read users"
  on public.users
  for select
  using (true);

create policy "Allow public upsert users"
  on public.users
  for insert
  with check (true);

create policy "Allow public update users"
  on public.users
  for update
  using (true)
  with check (true);

-- Reset demo-user onboarding for testing:
-- delete from public.users where user_id = 'demo-user';
