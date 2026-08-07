# Cursor Handoff: Event Cancellation DM Badge

**Status:** App fix shipped — Isaac still needs `scripts/setupMessageReadsRpc.sql` once if not already applied  
**Branch:** main

## Why “SQL didn’t fix it”

Two bugs stacked:

1. **RLS** — planner cannot update DJ’s `message_reads` → need `mark_conversation_unread` RPC (`SECURITY DEFINER`).
2. **Duplicate window (the one that survived SQL)** — insert skipped if *any* prior `event-cancelled` existed on the thread. After cancel Event A → book/accept Event B → cancel B, the new cancel row never landed. Latest message stayed the **DJ’s accept** → `isChatUnread` returns false for own messages **even with epoch `last_read_at`**. Badge impossible.

## Fix (app)

- Cancel activity text unique per event: `BOOKING ACTIVITY · event-cancelled:<eventId> · <name>`
- Removed broad window skip; exact-dupe only
- RPC result `success: false` logged as failure (not false ✅)

## Isaac

1. If not already: paste `scripts/setupMessageReadsRpc.sql` in Supabase SQL Editor → Run  
2. **New** event (or same planner↔DJ thread after a prior cancel is fine now) → book → cancel  
3. DJ Messages: unread highlight + preview `Event cancelled · …`  
4. Console: `✅ Marked conversation unread for DJ via RPC` (not ❌)

See `docs/handoff/CURRENT-STATE.md`.
