-- Follow The Crowd — Direct Message user blocking
-- Run in Supabase SQL Editor after messages/conversations exist.
-- Idempotent: safe to re-run.
-- Does not apply to event group chats.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id),
  constraint user_blocks_blocker_blocked_unique unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocker_id_idx
  on public.user_blocks (blocker_id);

create index if not exists user_blocks_blocked_id_idx
  on public.user_blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.are_users_dm_blocked(
  p_user_a text,
  p_user_b text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks ub
    where (
      ub.blocker_id = p_user_a
      and ub.blocked_id = p_user_b
    )
    or (
      ub.blocker_id = p_user_b
      and ub.blocked_id = p_user_a
    )
  );
$$;

create or replace function public.is_conversation_dm_blocked(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm_self
    join public.conversation_members cm_other
      on cm_self.conversation_id = cm_other.conversation_id
     and cm_self.user_id <> cm_other.user_id
    where cm_self.conversation_id = p_conversation_id
      and cm_self.user_id = public.auth_user_id()
      and public.are_users_dm_blocked(cm_self.user_id, cm_other.user_id)
  );
$$;

revoke all on function public.are_users_dm_blocked(text, text) from public;
revoke all on function public.is_conversation_dm_blocked(uuid) from public;
grant execute on function public.are_users_dm_blocked(text, text) to authenticated;
grant execute on function public.is_conversation_dm_blocked(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: user_blocks
-- ---------------------------------------------------------------------------

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_involved" on public.user_blocks;
drop policy if exists "user_blocks_insert_own" on public.user_blocks;
drop policy if exists "user_blocks_delete_own" on public.user_blocks;

create policy "user_blocks_select_involved"
  on public.user_blocks
  for select
  to authenticated
  using (
    blocker_id = public.auth_user_id()
    or blocked_id = public.auth_user_id()
  );

create policy "user_blocks_insert_own"
  on public.user_blocks
  for insert
  to authenticated
  with check (
    blocker_id = public.auth_user_id()
    and blocked_id <> public.auth_user_id()
  );

create policy "user_blocks_delete_own"
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = public.auth_user_id());

grant select, insert, delete on table public.user_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- DM send enforcement (1:1 conversations only)
-- ---------------------------------------------------------------------------

drop policy if exists "messages_insert_conversation_sender" on public.messages;

create policy "messages_insert_conversation_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    conversation_id is not null
    and user_id = public.auth_user_id()
    and public.is_conversation_member(conversation_id)
    and not public.is_conversation_dm_blocked(conversation_id)
  );

drop policy if exists "message_attachments_insert_uploader" on public.message_attachments;

create policy "message_attachments_insert_uploader"
  on public.message_attachments
  for insert
  to authenticated
  with check (
    uploader_id = public.auth_user_id()
    and public.is_conversation_member(conversation_id)
    and not public.is_conversation_dm_blocked(conversation_id)
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.conversation_id = message_attachments.conversation_id
        and m.user_id = public.auth_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- start_dm: do not create a new conversation with a blocked user
-- Existing conversations are still returned so history remains accessible.
-- ---------------------------------------------------------------------------

create or replace function public.start_dm(p_target_user_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id text := public.auth_user_id();
  v_conversation_id uuid;
begin
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null or btrim(p_target_user_id) = '' then
    raise exception 'Invalid target user';
  end if;

  if p_target_user_id = v_current_user_id then
    raise exception 'Cannot start a DM with yourself';
  end if;

  select cm_self.conversation_id
  into v_conversation_id
  from public.conversation_members cm_self
  join public.conversation_members cm_other
    on cm_self.conversation_id = cm_other.conversation_id
  where cm_self.user_id = v_current_user_id
    and cm_other.user_id = p_target_user_id
  order by cm_self.conversation_id
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  if public.are_users_dm_blocked(v_current_user_id, p_target_user_id) then
    raise exception 'Cannot message this user';
  end if;

  insert into public.conversations default values
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_current_user_id),
    (v_conversation_id, p_target_user_id);

  return v_conversation_id;
end;
$$;

revoke all on function public.start_dm(text) from public;
grant execute on function public.start_dm(text) to authenticated;

notify pgrst, 'reload schema';
