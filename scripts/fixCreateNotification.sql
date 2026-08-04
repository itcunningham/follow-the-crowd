-- Run this entire block in the Supabase SQL Editor.
-- Canonical public.create_notification (6-arg, optional p_reaction_id).
--
-- Why this exists: older scripts created a 5-arg overload. The reaction lifecycle
-- migration added a 6-arg version. If both remain, PostgREST calls without an
-- explicit p_reaction_id fail with "Could not choose the best candidate function"
-- and booking invites / crew-chat notifications break.
--
-- Idempotent: drops both signatures, recreates only the 6-arg function.
-- Requires: public.auth_user_id(), public.is_conversation_participant(),
--           public.is_event_crew_participant(), public.booking_requests,
--           public.notifications (with reaction_id column).

alter table public.notifications
  add column if not exists reaction_id uuid;

create index if not exists notifications_reaction_id_idx
  on public.notifications (reaction_id)
  where reaction_id is not null;

drop function if exists public.create_notification(text, text, text, text, text);
drop function if exists public.create_notification(text, text, text, text, text, uuid);

create or replace function public.create_notification(
  p_user_id text,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_reaction_id uuid default null
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
      where (
        br.recipient_id = v_sender_id
        and br.sender_id = p_user_id
        and br.status in ('accepted', 'declined')
      )
      or (
        br.sender_id = v_sender_id
        and br.recipient_id = p_user_id
        and br.status = 'cancelled'
      )
      or (
        br.recipient_id = v_sender_id
        and br.sender_id = p_user_id
        and br.status = 'cancelled'
      )
      or (
        br.recipient_id = v_sender_id
        and br.sender_id = p_user_id
        and br.status = 'pending'
        and br.rate_mode = 'open'
        and br.proposed_rate_status = 'pending'
        and br.proposed_rate is not null
        and br.proposed_rate > 0
        and br.proposed_rate_at > now() - interval '10 minutes'
      )
      or (
        br.sender_id = v_sender_id
        and br.recipient_id = p_user_id
        and br.status = 'accepted'
        and br.proposed_rate_status = 'accepted'
      )
      or (
        br.sender_id = v_sender_id
        and br.recipient_id = p_user_id
        and br.status = 'pending'
        and br.proposed_rate_status = 'declined'
      )
    ) then
      raise exception 'Not allowed to create booking_update notification';
    end if;
  end if;

  if p_reaction_id is not null then
    update public.notifications
       set title = p_title,
           body = p_body
     where reaction_id = p_reaction_id
       and user_id = p_user_id
    returning id into v_notification_id;

    if v_notification_id is not null then
      return v_notification_id;
    end if;

    insert into public.notifications (user_id, type, title, body, link, read, reaction_id)
    values (p_user_id, p_type, p_title, p_body, p_link, false, p_reaction_id)
    returning id into v_notification_id;

    return v_notification_id;
  end if;

  select n.id
    into v_notification_id
  from public.notifications n
  where n.user_id = p_user_id
    and n.type = p_type
    and n.title = p_title
    and n.link is not distinct from p_link
    and n.read = false
    and n.created_at > now() - interval '10 minutes'
  order by n.created_at desc
  limit 1;

  if v_notification_id is not null then
    return v_notification_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link, read)
  values (p_user_id, p_type, p_title, p_body, p_link, false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification(text, text, text, text, text, uuid) from public;
grant execute on function public.create_notification(text, text, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
