-- Follow The Crowd — TikTok profile link (run once in Supabase SQL Editor)
-- Idempotent. Safe to re-run after setupUserProfiles.sql / setupProfileMvpFields.sql.

alter table public.users add column if not exists tiktok_url text;
