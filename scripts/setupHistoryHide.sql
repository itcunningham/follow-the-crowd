-- Per-user history hide for planner cancelled events and bulk booking archive.
-- Run in Supabase SQL Editor after setupEvents.sql and setupBookingRequestArchiving.sql.

alter table public.events
  add column if not exists history_hidden_at timestamptz null;

create or replace function public.hide_event_from_history(p_event_id uuid)
returns jsonb
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

  update public.events
  set history_hidden_at = now()
  where id = p_event_id
    and owner_id = v_user_id
    and status = 'cancelled'
    and history_hidden_at is null
  returning * into v_event;

  if not found then
    raise exception 'Event not found or cannot be removed from history';
  end if;

  return to_jsonb(v_event);
end;
$$;

create or replace function public.hide_events_from_history(p_event_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_updated_ids uuid[] := '{}';
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_event_ids is null or cardinality(p_event_ids) = 0 then
    return jsonb_build_object('updated_ids', '[]'::jsonb);
  end if;

  foreach v_event_id in array p_event_ids loop
    update public.events
    set history_hidden_at = now()
    where id = v_event_id
      and owner_id = v_user_id
      and status = 'cancelled'
      and history_hidden_at is null;

    if found then
      v_updated_ids := array_append(v_updated_ids, v_event_id);
    end if;
  end loop;

  return jsonb_build_object(
    'updated_ids',
    to_jsonb(v_updated_ids)
  );
end;
$$;

create or replace function public.archive_booking_request(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_booking public.booking_requests;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_booking_id is null then
    raise exception 'Invalid booking id';
  end if;

  update public.booking_requests
  set archived_at = now()
  where id = p_booking_id
    and archived_at is null
    and (
      (sender_id = v_user_id and status = 'cancelled')
      or (
        recipient_id = v_user_id
        and status in ('declined', 'cancelled', 'accepted')
      )
    )
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or cannot be archived';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.hide_event_from_history(uuid) from public;
grant execute on function public.hide_event_from_history(uuid) to authenticated;

revoke all on function public.hide_events_from_history(uuid[]) from public;
grant execute on function public.hide_events_from_history(uuid[]) to authenticated;

revoke all on function public.archive_booking_request(uuid) from public;
grant execute on function public.archive_booking_request(uuid) to authenticated;

notify pgrst, 'reload schema';
