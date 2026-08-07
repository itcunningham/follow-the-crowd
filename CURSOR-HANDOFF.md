# Cursor Handoff: Event Cancellation DM Badge

**Status:** Blocked — Isaac must run `scripts/setupMessageReadsRpc.sql` once in Supabase SQL Editor  
**Branch:** main (app code ready)

## Problem

Planner cancels event → DJ should get **Messages (DM) unread badge**, not Crew Chats. Without the badge, DJs miss cancellations.

## Why it broke

`message_reads` RLS: `user_id = auth.uid()`. Planner cannot upsert the DJ’s row → 403.

## Fix

1. **App (shipped):** `insertEventCancellationActivityMessagesIfNeeded` inserts cancel activity DM (when needed) and **always** calls RPC `mark_conversation_unread`.
2. **SQL (not deployed):** `scripts/setupMessageReadsRpc.sql` — `SECURITY DEFINER` function that:
   - deletes stale `event_id` message_reads (clears Crew Chat badge)
   - upserts conversation row with epoch `last_read_at` (DM unread)
   - uses `ON CONFLICT (user_id, conversation_id) WHERE conversation_id IS NOT NULL` (matches partial unique index)

## Isaac: run SQL

Supabase → SQL Editor → paste **entire** `scripts/setupMessageReadsRpc.sql` → Execute.

## Then test

1. New event → book as DJ → cancel as planner  
2. Console: `✅ Marked conversation unread for DJ via RPC`  
3. UI: DM unread in Messages; **no** Crew Chats badge  

If RPC errors → SQL not applied (or PostgREST needs schema reload — re-run script / `notify pgrst, 'reload schema'`).

Full context: `docs/handoff/CURRENT-STATE.md` (blocked section at top).
