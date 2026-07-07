-- DESTRUCTIVE TEST-DATA CLEANUP — Follow The Crowd
--
-- Removes transactional test data so you can start fresh for manual QA.
-- Paste into Supabase SQL Editor and run manually. Do not run from app code or CI.
--
-- Deletes (all rows):
--   user_reports, message_reactions, message_attachments, message_reads,
--   notifications, messages (DMs + event crew chat), event_run_sheet_rows,
--   event_run_sheet_columns, booking_requests, events, booking_plans,
--   conversation_members, conversations
--
-- Preserves:
--   auth.users, public.users (profiles), dj_availability, user_blocks,
--   storage buckets and storage.objects (files may become orphaned),
--   RLS policies, RPC functions, and all app configuration
--
-- Idempotent: safe to re-run (empty tables delete zero rows).
--
-- Dry-run: change the final COMMIT to ROLLBACK to preview without persisting.
--
-- WARNING: This permanently deletes data listed above. Review before running.

begin;

-- 1. DM moderation reports (FK to messages/conversations; delete before messages)
delete from public.user_reports;

-- 2. Message reactions (FK → messages ON DELETE CASCADE)
delete from public.message_reactions;

-- 3. DM attachment metadata (FK → messages ON DELETE CASCADE)
delete from public.message_attachments;

-- 4. DM and event crew chat read receipts (FK → conversations/events ON DELETE CASCADE)
delete from public.message_reads;

-- 5. In-app notifications (booking/DM/message alerts)
delete from public.notifications;

-- 6. All chat messages: direct messages and event crew / group chat
delete from public.messages;

-- 7. Event run sheet rows (FK → events ON DELETE CASCADE; booking_request_id SET NULL)
delete from public.event_run_sheet_rows;

-- 8. Event run sheet column definitions (FK → events ON DELETE CASCADE)
delete from public.event_run_sheet_columns;

-- 9. Booking requests (FK → events ON DELETE SET NULL; must delete before events)
delete from public.booking_requests;

-- 10. Events (FK → booking_plans ON DELETE SET NULL)
delete from public.events;

-- 11. Planner booking plan drafts
delete from public.booking_plans;

-- 12. DM conversation membership, then empty conversation shells
delete from public.conversation_members;
delete from public.conversations;

commit;

-- Post-cleanup row counts (should all be 0 for deleted tables)
select 'user_reports' as table_name, count(*) as row_count from public.user_reports
union all select 'message_reactions', count(*) from public.message_reactions
union all select 'message_attachments', count(*) from public.message_attachments
union all select 'message_reads', count(*) from public.message_reads
union all select 'notifications', count(*) from public.notifications
union all select 'messages', count(*) from public.messages
union all select 'event_run_sheet_rows', count(*) from public.event_run_sheet_rows
union all select 'event_run_sheet_columns', count(*) from public.event_run_sheet_columns
union all select 'booking_requests', count(*) from public.booking_requests
union all select 'events', count(*) from public.events
union all select 'booking_plans', count(*) from public.booking_plans
union all select 'conversation_members', count(*) from public.conversation_members
union all select 'conversations', count(*) from public.conversations
order by table_name;

-- ---------------------------------------------------------------------------
-- STOP — MANUAL RUN ONLY
-- Run this script yourself in Supabase SQL Editor when you intend to wipe
-- test data. It modifies database contents. It does not delete auth users,
-- profiles, or storage buckets. Orphaned files may remain in storage buckets
-- (profile-images, dm-attachments, event-covers); remove those separately if needed.
-- ---------------------------------------------------------------------------
