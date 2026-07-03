-- Development RLS policies for DM flow (startDm + inbox).
-- Run in Supabase SQL Editor.
-- Does not change columns — policies only.

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;

-- conversations
drop policy if exists "Allow anon select conversations" on public.conversations;
drop policy if exists "Allow anon insert conversations" on public.conversations;

create policy "Allow anon select conversations"
  on public.conversations
  for select
  using (true);

create policy "Allow anon insert conversations"
  on public.conversations
  for insert
  with check (true);

-- conversation_members
drop policy if exists "Allow anon select conversation_members" on public.conversation_members;
drop policy if exists "Allow anon insert conversation_members" on public.conversation_members;

create policy "Allow anon select conversation_members"
  on public.conversation_members
  for select
  using (true);

create policy "Allow anon insert conversation_members"
  on public.conversation_members
  for insert
  with check (true);
