-- Secure delete/cancel event RPCs for event owners.
-- Run in Supabase SQL Editor after setupEvents.sql.

create or replace function public.delete_empty_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_event_id is null then
    raise exception 'Invalid event id';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.owner_id = v_user_id
  ) then
    raise exception 'Event not found or not allowed';
  end if;

  if exists (
    select 1
    from public.booking_requests br
    where br.event_id = p_event_id
  ) then
    raise exception 'Event has booking requests and cannot be deleted';
  end if;

  delete from public.events
  where id = p_event_id
    and owner_id = v_user_id;
end;
$$;

create or replace function public.cancel_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_event public.events;
  v_cancelled_bookings jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_event_id is null then
    raise exception 'Invalid event id';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.owner_id = v_user_id
  ) then
    raise exception 'Event not found or not allowed';
  end if;

  if not exists (
    select 1
    from public.booking_requests br
    where br.event_id = p_event_id
  ) then
    raise exception 'Event has no booking requests; delete instead';
  end if;

  update public.events
  set status = 'cancelled'
  where id = p_event_id
    and owner_id = v_user_id
    and status <> 'cancelled'
  returning * into v_event;

  if not found then
    raise exception 'Event not found or already cancelled';
  end if;

  with cancelled as (
    update public.booking_requests
    set status = 'cancelled'
    where event_id = p_event_id
      and status = 'pending'
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(cancelled)), '[]'::jsonb)
  into v_cancelled_bookings
  from cancelled;

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'cancelled_bookings', v_cancelled_bookings
  );
end;
$$;

revoke all on function public.delete_empty_event(uuid) from public;
grant execute on function public.delete_empty_event(uuid) to authenticated;

revoke all on function public.cancel_event(uuid) from public;
grant execute on function public.cancel_event(uuid) to authenticated;

notify pgrst, 'reload schema';
