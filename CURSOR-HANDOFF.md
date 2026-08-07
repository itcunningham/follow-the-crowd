# Cursor Handoff: Event Cancellation Badges

**Status:** App on main — **re-run** `scripts/setupMessageReadsRpc.sql` (mark crew read, not delete)

## Expected

- Messages (DM): unread highlight after planner cancels  
- Crew Chats: **no** badge / cancelled event leaves the list  

## Why Crew Chats showed 1

1. Cancel handler inserted crew message `"Event was cancelled"` after RPC cleared event reads → unread again  
2. RPC **deleted** event `message_reads` → missing `last_read_at` = unread while event still listed  
3. Soft 30s group-chat reload skipped dropping the cancelled event  

## Fix

- No crew cancel message insert  
- RPC upserts event read at `now()` (clears Crew badge)  
- Hard group-chat refetch + prune on cancel broadcast  

## Isaac

Paste `scripts/setupMessageReadsRpc.sql` in Supabase SQL Editor → Run. Then cancel a booked event again.
