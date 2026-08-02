-- =============================================================================
-- FTC — Publish booking_requests to Supabase Realtime
-- Paste this entire file into Supabase SQL Editor → Run
-- =============================================================================
--
-- WHY THIS IS REQUIRED
--
-- booking_requests was never added to the `supabase_realtime` publication. Only
-- message_reactions and message_reads were ever published explicitly. Postgres
-- does not emit replication events for unpublished tables, so:
--
--   * the app's only booking_requests subscription (dm-bookings:<conversationId>)
--     has never received a single event — it subscribes successfully and then
--     stays silent, which is why it looked like it worked;
--   * a DJ accepting a booking produced no event for the planner, for a "both"
--     account, or for the DJ's own other devices/tabs.
--
-- Everything that appeared to update live was local optimistic state in the tab
-- that performed the write. Adding the table to the publication is what makes
-- cross-account and cross-device reconciliation possible at all.
--
-- REPLICA IDENTITY FULL is set so UPDATE events carry the complete row rather
-- than only the primary key plus changed columns. The client subscriptions filter
-- on recipient_id and sender_id, and those columns do not change on a status
-- update — without FULL they are absent from the payload Postgres emits, and
-- Realtime cannot match the row against either filter, so the event is dropped
-- before it reaches any client.
--
-- Safe to re-run: both statements are guarded / idempotent. No data is modified.
-- =============================================================================

begin;

-- Full row images on UPDATE, so recipient_id / sender_id are always present for
-- Realtime's filter matching (they are unchanged columns on a status update).
alter table public.booking_requests replica identity full;

-- Add to the realtime publication only if it is not already a member.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_requests'
  ) then
    alter publication supabase_realtime add table public.booking_requests;
  end if;
end
$$;

commit;

-- =============================================================================
-- VERIFICATION — both rows must return passed = true
-- =============================================================================

select
  'booking_requests in supabase_realtime publication' as check,
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_requests'
  ) as passed

union all

select
  'booking_requests replica identity is full' as check,
  (
    select c.relreplident = 'f'
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'booking_requests'
  ) as passed;
