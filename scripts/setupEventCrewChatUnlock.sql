-- Crew chat unlock rules for Follow The Crowd.
-- Run in Supabase SQL Editor after setupEvents.sql and setupEventCrewChat.sql.
-- Idempotent: safe to re-run.
--
-- Unlock model:
-- - crew_chat_started_at is set when the planner manually starts chat (1 accepted DJ)
--   or when auto-start runs after the 2nd accepted DJ.
-- - Chat is accessible when the event is not cancelled, at least one accepted DJ exists,
--   and crew_chat_started_at is not null.

alter table public.events
  add column if not exists crew_chat_started_at timestamptz;

create or replace function public.count_event_accepted_crew_djs(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.booking_requests br
  where br.event_id = p_event_id
    and br.status = 'accepted';
$$;

revoke all on function public.count_event_accepted_crew_djs(uuid) from public;
grant execute on function public.count_event_accepted_crew_djs(uuid) to authenticated;

create or replace function public.is_event_crew_chat_unlocked(p_event_id uuid)
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
      and e.status <> 'cancelled'
      and e.crew_chat_started_at is not null
      and public.count_event_accepted_crew_djs(p_event_id) >= 1
  );
$$;

revoke all on function public.is_event_crew_chat_unlocked(uuid) from public;
grant execute on function public.is_event_crew_chat_unlocked(uuid) to authenticated;

create or replace function public.is_event_crew_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_event_crew_chat_unlocked(p_event_id)
    and public.is_event_crew_participant(p_event_id, public.auth_user_id());
$$;

create or replace function public.start_event_crew_chat(p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_event public.events;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_event_id is null then
    raise exception 'Invalid event id';
  end if;

  select *
  into v_event
  from public.events e
  where e.id = p_event_id
    and e.owner_id = v_user_id
    and e.status <> 'cancelled';

  if not found then
    raise exception 'Event not found or not allowed';
  end if;

  if public.count_event_accepted_crew_djs(p_event_id) < 1 then
    raise exception 'Crew chat requires at least one accepted DJ';
  end if;

  update public.events
  set crew_chat_started_at = coalesce(crew_chat_started_at, now())
  where id = p_event_id
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.ensure_event_crew_chat_auto_started(p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if p_event_id is null then
    raise exception 'Invalid event id';
  end if;

  if public.count_event_accepted_crew_djs(p_event_id) < 2 then
    select * into v_event from public.events where id = p_event_id;

    if not found then
      raise exception 'Event not found';
    end if;

    return v_event;
  end if;

  update public.events e
  set crew_chat_started_at = coalesce(e.crew_chat_started_at, now())
  where e.id = p_event_id
    and e.status <> 'cancelled'
  returning * into v_event;

  if not found then
    raise exception 'Event not found';
  end if;

  return v_event;
end;
$$;

revoke all on function public.start_event_crew_chat(uuid) from public;
grant execute on function public.start_event_crew_chat(uuid) to authenticated;

revoke all on function public.ensure_event_crew_chat_auto_started(uuid) from public;
grant execute on function public.ensure_event_crew_chat_auto_started(uuid) to authenticated;

create or replace function public.get_event_crew_participant_ids(p_event_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_event_crew_chat_unlocked(p_event_id) then
    raise exception 'Not allowed to read event crew participants';
  end if;

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

notify pgrst, 'reload schema';
