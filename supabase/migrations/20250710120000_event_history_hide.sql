-- Event history hide for planner cancelled events.
-- Idempotent. Safe to run once on production.
-- Prerequisites: setupEvents.sql, setupProductionRls.sql

alter table public.events
  add column if not exists history_hidden_at timestamptz null;

comment on column public.events.history_hidden_at is
  'When set by the event owner, hides this cancelled event from the owner''s Events History view only.';

create index if not exists events_owner_cancelled_visible_history_idx
  on public.events (owner_id, created_at desc)
  where status = 'cancelled' and history_hidden_at is null;

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

revoke all on function public.hide_event_from_history(uuid) from public;
grant execute on function public.hide_event_from_history(uuid) to authenticated;

revoke all on function public.hide_events_from_history(uuid[]) from public;
grant execute on function public.hide_events_from_history(uuid[]) to authenticated;

notify pgrst, 'reload schema';
