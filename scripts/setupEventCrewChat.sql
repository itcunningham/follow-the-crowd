-- Run in Supabase SQL Editor.
-- Tightens event crew chat RLS on public.messages and extends create_notification
-- for /events/{uuid}/chat message links.
-- Idempotent: safe to re-run.
-- Prerequisites: setupProductionRls.sql, setupEvents.sql
--
-- Note: public.messages.event_id may be text (legacy) or uuid.
-- This script migrates text -> uuid when every non-null value is a valid UUID,
-- otherwise keeps text and uses event_id::text in RLS via a safe wrapper.

-- ---------------------------------------------------------------------------
-- Helpers: event crew membership
-- ---------------------------------------------------------------------------

create or replace function public.is_event_crew_participant(
  p_event_id uuid,
  p_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.owner_id = p_user_id
  )
  or exists (
    select 1
    from public.booking_requests br
    where br.event_id = p_event_id
      and br.recipient_id = p_user_id
      and br.status = 'accepted'
  );
$$;

create or replace function public.is_event_crew_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_event_crew_participant(p_event_id, public.auth_user_id());
$$;

-- Wrapper for messages.event_id whether stored as text or uuid.
create or replace function public.is_event_crew_member_for_message(p_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_event_id is not null
    and btrim(p_event_id) <> ''
    and p_event_id ~ '^[0-9a-fA-F-]{36}$'
    and public.is_event_crew_member(p_event_id::uuid);
$$;

revoke all on function public.is_event_crew_participant(uuid, text) from public;
revoke all on function public.is_event_crew_member(uuid) from public;
revoke all on function public.is_event_crew_member_for_message(text) from public;
grant execute on function public.is_event_crew_participant(uuid, text) to authenticated;
grant execute on function public.is_event_crew_member(uuid) to authenticated;
grant execute on function public.is_event_crew_member_for_message(text) to authenticated;

create or replace function public.get_event_crew_participant_ids(p_event_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_event_crew_member(p_event_id) then
    raise exception 'Not allowed to read event crew participants';
  end if;

  return query
  select e.owner_id
  from public.events e
  where e.id = p_event_id

  union

  select br.recipient_id
  from public.booking_requests br
  where br.event_id = p_event_id
    and br.status = 'accepted';
end;
$$;

revoke all on function public.get_event_crew_participant_ids(uuid) from public;
grant execute on function public.get_event_crew_participant_ids(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Safe migration: messages.event_id text -> uuid (only when all values valid)
-- ---------------------------------------------------------------------------

do $$
declare
  v_data_type text;
  v_invalid_count bigint;
begin
  select c.data_type
  into v_data_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'messages'
    and c.column_name = 'event_id';

  if v_data_type is null then
    raise notice 'public.messages.event_id column not found; skipping type migration';
    return;
  end if;

  if v_data_type = 'uuid' then
    raise notice 'public.messages.event_id is already uuid; skipping type migration';
    return;
  end if;

  if v_data_type <> 'text' then
    raise notice 'public.messages.event_id has unexpected type %; skipping type migration', v_data_type;
    return;
  end if;

  select count(*)
  into v_invalid_count
  from public.messages m
  where m.event_id is not null
    and btrim(m.event_id) <> ''
    and m.event_id !~ '^[0-9a-fA-F-]{36}$';

  if v_invalid_count > 0 then
    raise notice
      'public.messages.event_id kept as text (% invalid non-null values); RLS uses ::text wrapper',
      v_invalid_count;
    return;
  end if;

  alter table public.messages
    alter column event_id type uuid using nullif(btrim(event_id), '')::uuid;

  raise notice 'public.messages.event_id migrated from text to uuid';
exception
  when others then
    raise notice 'public.messages.event_id text -> uuid migration skipped: %', sqlerrm;
end;
$$;

create index if not exists messages_event_id_idx
  on public.messages (event_id);

-- ---------------------------------------------------------------------------
-- RLS: event crew chat messages (replace MVP open policies)
-- ---------------------------------------------------------------------------

drop policy if exists "messages_select_event_authenticated" on public.messages;
drop policy if exists "messages_insert_event_sender" on public.messages;
drop policy if exists "messages_select_event_crew" on public.messages;
drop policy if exists "messages_insert_event_crew" on public.messages;

create policy "messages_select_event_crew"
  on public.messages
  for select
  to authenticated
  using (
    event_id is not null
    and public.is_event_crew_member_for_message(event_id::text)
  );

create policy "messages_insert_event_crew"
  on public.messages
  for insert
  to authenticated
  with check (
    event_id is not null
    and user_id = public.auth_user_id()
    and public.is_event_crew_member_for_message(event_id::text)
  );

-- ---------------------------------------------------------------------------
-- Secure RPC: create_notification (extend message links for event crew chat)
-- ---------------------------------------------------------------------------

create or replace function public.create_notification(
  p_user_id text,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id text := public.auth_user_id();
  v_notification_id uuid;
  v_conversation_id uuid;
  v_event_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'Invalid notification recipient';
  end if;

  if p_user_id = v_sender_id then
    raise exception 'Cannot create notification for yourself';
  end if;

  if p_type not in ('message', 'booking_request', 'booking_update') then
    raise exception 'Invalid notification type';
  end if;

  if p_type = 'message' then
    if p_link ~ '^/dm/[0-9a-fA-F-]{36}$' then
      v_conversation_id := substring(p_link from '^/dm/([0-9a-fA-F-]{36})$')::uuid;

      if not public.is_conversation_participant(v_conversation_id, p_user_id) then
        raise exception 'Not allowed to notify this user for this conversation';
      end if;
    elsif p_link ~ '^/events/[0-9a-fA-F-]{36}/chat$' then
      v_event_id := substring(p_link from '^/events/([0-9a-fA-F-]{36})/chat$')::uuid;

      if not public.is_event_crew_participant(v_event_id, p_user_id) then
        raise exception 'Not allowed to notify this user for this event crew chat';
      end if;

      if not public.is_event_crew_participant(v_event_id, v_sender_id) then
        raise exception 'Not allowed to send event crew chat notification';
      end if;
    else
      raise exception 'Invalid message notification link';
    end if;
  elsif p_type = 'booking_request' then
    if not exists (
      select 1
      from public.booking_requests br
      where br.sender_id = v_sender_id
        and br.recipient_id = p_user_id
        and br.created_at > now() - interval '10 minutes'
    ) then
      raise exception 'Not allowed to create booking_request notification';
    end if;
  elsif p_type = 'booking_update' then
    if not exists (
      select 1
      from public.booking_requests br
      where br.recipient_id = v_sender_id
        and br.sender_id = p_user_id
        and br.status in ('accepted', 'declined')
    ) then
      raise exception 'Not allowed to create booking_update notification';
    end if;
  end if;

  insert into public.notifications (user_id, type, title, body, link, read)
  values (p_user_id, p_type, p_title, p_body, p_link, false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification(text, text, text, text, text) from public;
grant execute on function public.create_notification(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
