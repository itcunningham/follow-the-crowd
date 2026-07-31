-- Adds the optional event_brand column used by the Event Brands MVP feature.
-- Run in Supabase SQL Editor.
--
-- No migration needed for the promoter's saved brand list itself: it reuses the
-- existing public.users.promoter_brand_name text column as a "|"-separated list
-- (mirrors how public.users.genre already stores a delimited list of tags), so an
-- existing single brand name parses as a one-item list automatically with no data
-- loss and no schema change.
--
-- This script only adds the new, optional per-event column recording which saved
-- brand (if any) an event was created under. It is intentionally nullable and
-- never required — the app already tolerates this column being absent (falls back
-- gracefully, matching the existing crew_chat_started_at / history_hidden_at
-- pattern in lib/events/eventQueryFields.ts) until this script has been run.

alter table public.events
  add column if not exists event_brand text;

notify pgrst, 'reload schema';
