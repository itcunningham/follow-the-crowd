-- Follow The Crowd — MVP profile fields (run once in Supabase SQL Editor)
-- Idempotent. Safe to re-run after setupUserProfiles.sql / setupRoleProfileFields.sql.

alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists artist_name text;
alter table public.users add column if not exists dj_booking_contact_name text;
alter table public.users add column if not exists promoter_brand_name text;
alter table public.users add column if not exists promoter_brand_description text;
alter table public.users add column if not exists website_url text;

create unique index if not exists users_username_unique_idx
  on public.users (lower(username))
  where username is not null and username <> '';
