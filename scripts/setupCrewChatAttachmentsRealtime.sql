-- =============================================================================
-- FTC — Publish message_attachments to Supabase Realtime
-- Paste this entire file into Supabase SQL Editor → Run
-- =============================================================================
--
-- WHY THIS IS REQUIRED
--
-- message_attachments was never added to the `supabase_realtime` publication.
-- setupDmAttachmentsAndReactions.sql created the table and published
-- message_reactions in the same file, but not message_attachments; nothing has
-- published it since. Postgres emits no replication events for unpublished
-- tables, so both attachment subscriptions in the app:
--
--   * dm-attachments:<conversationId>            (app/dm/[conversationId])
--   * event-crew-chat-attachments:<eventId>      (app/events/[eventId]/chat)
--
-- subscribe successfully, report SUBSCRIBED, and then never receive a single
-- event. Same failure mode, and the same reason it looked like it worked, as
-- booking_requests in setupBookingRequestsRealtime.sql.
--
-- The user-visible symptom, reproduced across two devices in Production: a
-- photo sent in Crew Chat never appears for the other participants. The sender
-- sees it because sendCrewChatAttachments writes the rows into local state
-- directly; everyone else is waiting on an event Postgres never emits. A hard
-- refresh shows the image because the reload path is a plain select
-- (listEventCrewChatAttachmentsForEvent), not realtime — which is why the
-- stored image was always intact.
--
-- An image-only message carries empty `messages.text`, so with no attachment
-- rows the bubble renders nothing at all (GroupChatMessageBubble's
-- `!hasText && !hasAttachments` guard) rather than an empty bubble. That is why
-- the message appears to be missing entirely rather than arriving blank.
--
-- REPLICA IDENTITY IS DELIBERATELY NOT CHANGED. booking_requests needed
-- `replica identity full` because it subscribes to UPDATE, and an unchanged
-- filter column is absent from an UPDATE payload without it. Both
-- message_attachments subscriptions are INSERT-only, and an INSERT event always
-- carries the complete new row, so the `conversation_id` / `event_id` filters
-- match on the default replica identity. Setting FULL here would add WAL volume
-- for no behavioural gain.
--
-- RLS is unchanged and still applies: Realtime evaluates
-- "message_attachments_select_member" (setupEventCrewChatAttachments.sql) per
-- subscriber, so a user only ever receives attachment rows for a conversation
-- they belong to or an event whose crew they are on. Publishing a table does
-- not bypass row-level security.
--
-- Safe to re-run: the statement is guarded and idempotent. No data is modified.
-- =============================================================================

begin;

-- Add to the realtime publication only if it is not already a member.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_attachments'
  ) then
    alter publication supabase_realtime add table public.message_attachments;
  end if;
end
$$;

commit;

-- =============================================================================
-- VERIFICATION — the first row must return passed = true
-- =============================================================================

select
  'message_attachments in supabase_realtime publication' as check,
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_attachments'
  ) as passed

union all

select
  'message_attachments RLS still enabled' as check,
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'message_attachments'
  ) as passed;
