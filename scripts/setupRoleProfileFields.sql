-- Run in Supabase SQL Editor after setupUserProfiles.sql
-- Adds role-specific profile fields to public.users

alter table public.users add column if not exists dj_availability text;
alter table public.users add column if not exists dj_past_gigs text;
alter table public.users add column if not exists promoter_venues_used text;
alter table public.users add column if not exists promoter_upcoming_events text;
alter table public.users add column if not exists promoter_past_events text;
