-- Harden ensure_event_crew_chat_auto_started: require event owner or accepted crew participant.
-- Idempotent: safe to re-run in Supabase SQL Editor.

create or replace function public.ensure_event_crew_chat_auto_started(p_event_id uuid)
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

  if not public.is_event_crew_participant(p_event_id, v_user_id) then
    raise exception 'Not allowed to start crew chat for this event';
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

revoke all on function public.ensure_event_crew_chat_auto_started(uuid) from public;
grant execute on function public.ensure_event_crew_chat_auto_started(uuid) to authenticated;

notify pgrst, 'reload schema';
