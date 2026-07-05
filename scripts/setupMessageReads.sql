-- Run in Supabase SQL Editor.
-- Tracks per-user last-read timestamps for DMs and event group chats.
-- Idempotent: safe to re-run.
--
-- Requires public.is_conversation_member(uuid) from setupProductionRls.sql
-- for DM read-receipt SELECT access (conversation members only).

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  conversation_id uuid references public.conversations (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  constraint message_reads_target_check check (
    (
      conversation_id is not null
      and event_id is null
    )
    or (
      conversation_id is null
      and event_id is not null
    )
  )
);

create unique index if not exists message_reads_user_conversation_idx
  on public.message_reads (user_id, conversation_id)
  where conversation_id is not null;

create unique index if not exists message_reads_user_event_idx
  on public.message_reads (user_id, event_id)
  where event_id is not null;

create index if not exists message_reads_user_id_idx
  on public.message_reads (user_id);

create index if not exists message_reads_conversation_id_idx
  on public.message_reads (conversation_id)
  where conversation_id is not null;

grant select, insert, update, delete on public.message_reads to anon, authenticated;

alter table public.message_reads enable row level security;

drop policy if exists "message_reads_select_own" on public.message_reads;
drop policy if exists "message_reads_select_dm_participant" on public.message_reads;
drop policy if exists "message_reads_insert_own" on public.message_reads;
drop policy if exists "message_reads_update_own" on public.message_reads;
drop policy if exists "message_reads_delete_own" on public.message_reads;

-- Users can read their own read rows (inbox unread) and co-participant rows in DMs (read receipts).
create policy "message_reads_select_own"
  on public.message_reads
  for select
  to anon, authenticated
  using (
    user_id = auth.uid()::text
    or (
      conversation_id is not null
      and event_id is null
      and public.is_conversation_member(conversation_id)
    )
  );

create policy "message_reads_insert_own"
  on public.message_reads
  for insert
  to anon, authenticated
  with check (user_id = auth.uid()::text);

create policy "message_reads_update_own"
  on public.message_reads
  for update
  to anon, authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy "message_reads_delete_own"
  on public.message_reads
  for delete
  to anon, authenticated
  using (user_id = auth.uid()::text);

-- Enable Realtime updates for read receipts (no-op if already added).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table public.message_reads;
  end if;
end $$;
