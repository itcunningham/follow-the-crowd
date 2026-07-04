-- Follow The Crowd — DM attachments and emoji reactions
-- Run in Supabase SQL Editor after messages/conversations exist.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null,
  uploader_id text not null,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_id_idx
  on public.message_attachments (message_id);

create index if not exists message_attachments_conversation_id_idx
  on public.message_attachments (conversation_id);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint message_reactions_message_user_unique unique (message_id, user_id)
);

create index if not exists message_reactions_message_id_idx
  on public.message_reactions (message_id);

-- ---------------------------------------------------------------------------
-- RLS: message_attachments
-- ---------------------------------------------------------------------------

alter table public.message_attachments enable row level security;

drop policy if exists "message_attachments_select_member" on public.message_attachments;
drop policy if exists "message_attachments_insert_uploader" on public.message_attachments;

create policy "message_attachments_select_member"
  on public.message_attachments
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "message_attachments_insert_uploader"
  on public.message_attachments
  for insert
  to authenticated
  with check (
    uploader_id = public.auth_user_id()
    and public.is_conversation_member(conversation_id)
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.conversation_id = message_attachments.conversation_id
        and m.user_id = public.auth_user_id()
    )
  );

grant select, insert on table public.message_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: message_reactions
-- ---------------------------------------------------------------------------

alter table public.message_reactions enable row level security;

drop policy if exists "message_reactions_select_member" on public.message_reactions;
drop policy if exists "message_reactions_insert_own" on public.message_reactions;
drop policy if exists "message_reactions_update_own" on public.message_reactions;
drop policy if exists "message_reactions_delete_own" on public.message_reactions;

create policy "message_reactions_select_member"
  on public.message_reactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_reactions.message_id
        and m.conversation_id is not null
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "message_reactions_insert_own"
  on public.message_reactions
  for insert
  to authenticated
  with check (
    user_id = public.auth_user_id()
    and exists (
      select 1
      from public.messages m
      where m.id = message_reactions.message_id
        and m.conversation_id is not null
        and public.is_conversation_member(m.conversation_id)
    )
  );

create policy "message_reactions_update_own"
  on public.message_reactions
  for update
  to authenticated
  using (user_id = public.auth_user_id())
  with check (user_id = public.auth_user_id());

create policy "message_reactions_delete_own"
  on public.message_reactions
  for delete
  to authenticated
  using (user_id = public.auth_user_id());

grant select, insert, update, delete on table public.message_reactions to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: dm-attachments bucket
-- Path format: {conversation_id}/{user_id}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('dm-attachments', 'dm-attachments', true)
on conflict (id) do update set public = true;

drop policy if exists "dm_attachments_public_read" on storage.objects;
drop policy if exists "dm_attachments_insert_member" on storage.objects;
drop policy if exists "dm_attachments_update_own" on storage.objects;
drop policy if exists "dm_attachments_delete_own" on storage.objects;

create policy "dm_attachments_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'dm-attachments');

create policy "dm_attachments_insert_member"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and auth.uid() is not null
    and (storage.foldername(name))[2] = public.auth_user_id()
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "dm_attachments_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[2] = public.auth_user_id()
  )
  with check (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[2] = public.auth_user_id()
  );

create policy "dm_attachments_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[2] = public.auth_user_id()
  );

notify pgrst, 'reload schema';
