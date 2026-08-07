# Cursor Handoff: Event Cancellation DM Badge

**Status:** Blocked - waiting for SQL deployment  
**Branch:** main (code already merged)  
**Issue:** When planner cancels event, DJ should see unread DM badge. Currently doesn't appear.

## The Fix (Already Coded)

Two files changed on `main`:

### 1. `lib/bookingRequests.ts`
- Modified `insertEventCancellationActivityMessagesIfNeeded()` 
- Now always marks conversation unread (even if message insertion skipped)
- Calls new RPC function `mark_conversation_unread()` instead of direct Supabase update

### 2. `scripts/setupMessageReadsRpc.sql` ← **NOT YET DEPLOYED**
- Creates new RPC function with elevated permissions
- Deletes message_reads rows with event_id (removes Crew Chat badge)
- Inserts conversation row with epoch timestamp (marks DM unread)

## Why It Was Broken

RLS policy on `message_reads` table only allows users to update their own rows:
```sql
with check (user_id = auth.uid()::text)
```

Planner can't update DJ's row → 403 Forbidden → nothing works

## What You Need To Do

**One-time setup (run once in Supabase):**

1. Go to Supabase dashboard → SQL Editor
2. Copy entire contents of `scripts/setupMessageReadsRpc.sql`
3. Paste and Execute
4. Done

**Then test:**

1. Create brand new event (not reused)
2. Book as DJ
3. Cancel as planner
4. Look in browser console for: `✅ Marked conversation unread for DJ via RPC`
5. Check UI:
   - ✅ DM shows unread highlight in Messages tab
   - ✅ NO badge on Crew Chats tab

**If console shows error:** It's the 403 again = SQL wasn't deployed correctly

**If it works:** Commit is already done, just close this task.

---

For full context, see `docs/handoff/CURRENT-STATE.md` (section at top)
