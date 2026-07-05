-- Idempotent migration: optional landscape cover image URL per event.
-- Run in Supabase SQL Editor after setupEvents.sql.

alter table public.events
  add column if not exists cover_image_url text;

notify pgrst, 'reload schema';
