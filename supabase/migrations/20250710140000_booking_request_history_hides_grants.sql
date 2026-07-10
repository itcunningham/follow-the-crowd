-- Grants for per-user booking history hides.
-- Idempotent. Safe to paste and run once in Supabase SQL Editor on production.
-- Run after 20250710130000_booking_request_history_hides.sql.

revoke all on table public.booking_request_history_hides from anon;

grant select, insert, delete on table public.booking_request_history_hides to authenticated;

notify pgrst, 'reload schema';
