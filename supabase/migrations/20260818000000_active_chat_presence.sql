-- ============================================================================
-- PUBLIC.ACTIVE_CHAT_PRESENCE
-- ============================================================================
-- One row per user, tracking the exact DM/crew chat thread (by the same bare
-- link string createNotification() is called with -- e.g. "/dm/<id>" or
-- "/events/<id>/chat") they're actively viewing right now, if any.
--
-- Purpose: let push-send skip an external push for a message notification
-- when the recipient is already looking at that exact thread. Deliberately
-- NOT a general presence system -- no "online" status, no per-conversation
-- membership list, just "which single thread is this user's client currently
-- reporting as active." The client refreshes this row on a short heartbeat
-- while the thread is mounted and visible, and push-send treats any row
-- older than its own TTL as stale (see push-send's PRESENCE_TTL_MS) --
-- backgrounding or closing the app stops suppression even if the client
-- never gets a chance to clear its row on the way out.

create table if not exists public.active_chat_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  thread_link text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.active_chat_presence enable row level security;

drop policy if exists "active_chat_presence_select_own" on public.active_chat_presence;
drop policy if exists "active_chat_presence_insert_own" on public.active_chat_presence;
drop policy if exists "active_chat_presence_update_own" on public.active_chat_presence;
drop policy if exists "active_chat_presence_delete_own" on public.active_chat_presence;

-- Nothing in the client ever needs to read another user's presence row (only
-- push-send does, via the service role, which bypasses RLS) -- select is
-- scoped to own-row only so this can't be used to snoop on what thread
-- someone else is currently viewing.
create policy "active_chat_presence_select_own"
  on public.active_chat_presence for select
  using (user_id = auth.uid());

create policy "active_chat_presence_insert_own"
  on public.active_chat_presence for insert
  with check (user_id = auth.uid());

create policy "active_chat_presence_update_own"
  on public.active_chat_presence for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "active_chat_presence_delete_own"
  on public.active_chat_presence for delete
  using (user_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================

revoke all on table public.active_chat_presence from anon;
revoke all on table public.active_chat_presence from authenticated;

grant select, insert, update, delete on table public.active_chat_presence to authenticated;
grant all on table public.active_chat_presence to service_role;
