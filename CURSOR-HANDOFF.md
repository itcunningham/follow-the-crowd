# Cursor Handoff: Event Cancellation DM Badge

**Status:** Blocked - waiting for SQL deployment  
**Branch:** main (code already merged)  

## Problem Statement

When a **planner cancels an event**:
- DJs with accepted bookings should get a **notification badge in their Messages inbox** (private DMs)
- This is the "cancel notification" — tells the DJ their gig was cancelled
- **What should happen:** DM conversation shows unread badge (red dot + "1" count)
- **What's actually happening:** Nothing. No badge. DJ doesn't know the event was cancelled unless they manually check.

Secondary issue (partially fixed):
- Crew Chat badge was appearing (wrong location) — this is now fixed
- The DM badge is still missing (the main issue)

## What We're Trying to Solve

**User's goal:** "When a planner cancels an event, DJs should see a notification badge in their Messages tab, NOT on Crew Chats. The Crew Chat gets deleted anyway when the event is cancelled, so it's pointless to badge there."

**Why it matters:**
- DJs have 100+ DMs and don't check all of them
- A badge is the only way to surface "your event was cancelled"
- Without it, DJs miss cancellations and show up to non-existent gigs
- Crew Chats are redundant because they're auto-deleted when event is cancelled

## The Fix (Already Coded)

**Solution: Use an RPC function that runs with elevated permissions**

RPC functions in Postgres can be marked `SECURITY DEFINER`, which means they run with the permissions of the user who created them (usually database owner), not the caller. This bypasses RLS.

Two files changed on `main`:

### 1. `lib/bookingRequests.ts` — Application code
- **What it does:** When event is cancelled, insert activity message + call RPC function
- **Key change:** Moved mark-unread logic outside the duplicate-check so it always runs
- **Calls:** `mark_conversation_unread(dj_user_id, conversation_id, event_id)`

### 2. `scripts/setupMessageReadsRpc.sql` — Database function ← **NOT YET DEPLOYED**
- **Function name:** `mark_conversation_unread(p_user_id, p_conversation_id, p_event_id)`
- **What it does:**
  - Delete any stale `message_reads` row with event_id (removes Crew Chat badge)
  - Insert/update `message_reads` row for conversation with epoch timestamp (1970-01-01)
  - Epoch timestamp ensures ALL messages in that conversation appear unread
- **Why it works:** Runs as database owner → bypasses RLS → can update any user's row
- **Who can call it:** Any authenticated user (GRANT EXECUTE TO authenticated)

## How The Badge System Works

In FTC, unread badges are calculated from the `message_reads` table:
- One row per user per conversation (or per event for crew chats)
- `last_read_at` timestamp indicates when user last read that chat
- If new message `created_at > last_read_at` → badge shows "unread"

When event is cancelled, code needs to:
1. Insert a system message "Event cancelled" into the DM conversation
2. Mark that conversation as unread for the DJ (set `last_read_at` to old timestamp so new message appears unread)
3. This creates the badge on the Messages tab

## Why It Was Broken

**Root cause: RLS (Row Level Security) policy blocks cross-user updates**

The `message_reads` table has this RLS policy:
```sql
with check (user_id = auth.uid()::text)
```

This means: "Only authenticated users can update their own rows"

**What happens when we try to fix it:**
1. Planner cancels event
2. Code tries to update DJ's `message_reads` row (to mark DM as unread)
3. Planner's auth context ≠ DJ's user_id → 403 Forbidden
4. Update fails silently → DJ gets no badge

**Why naive fixes didn't work:**
- Can't just insert/upsert the row (same RLS check)
- Can't bypass RLS with regular Supabase client calls
- Need elevated permissions (RPC function with SECURITY DEFINER)

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
