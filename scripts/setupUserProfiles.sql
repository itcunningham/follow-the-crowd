-- Run in Supabase SQL Editor after setupUsersOnboarding.sql

alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists genre text;
alter table public.users add column if not exists instagram_url text;
alter table public.users add column if not exists soundcloud_url text;
alter table public.users add column if not exists location text;
alter table public.users add column if not exists avatar_url text;

-- Profile fields are optional except display_name for MVP profile completion.
