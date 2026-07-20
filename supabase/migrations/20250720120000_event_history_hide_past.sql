-- Extend event history hide to past (non-cancelled) History rows, not only cancelled.
-- Safe to run once in Supabase SQL Editor after 20250710120000_event_history_hide.sql.

comment on column public.events.history_hidden_at is
  'When set by the event owner, hides this event from the owner''s Events History view only.';

create or replace function public.planner_event_can_hide_from_history(
  p_event_date text,
  p_set_time text,
  p_status text
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_date date;
  v_date_text text;
begin
  if p_status = 'cancelled' then
    return true;
  end if;

  if p_status = 'draft' then
    return false;
  end if;

  v_date_text := trim(coalesce(p_event_date, ''));

  if v_date_text ~ '^\d{4}-\d{2}-\d{2}' then
    v_date := substring(v_date_text from 1 for 10)::date;
  else
    return false;
  end if;

  if v_date < current_date then
    return true;
  end if;

  if v_date > current_date then
    return false;
  end if;

  return p_status = 'completed';
end;
$$;

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
    and history_hidden_at is null
    and public.planner_event_can_hide_from_history(event_date, set_time, status)
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
      and history_hidden_at is null
      and public.planner_event_can_hide_from_history(event_date, set_time, status);

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

revoke all on function public.planner_event_can_hide_from_history(text, text, text) from public;
grant execute on function public.planner_event_can_hide_from_history(text, text, text) to authenticated;

notify pgrst, 'reload schema';
