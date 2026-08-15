-- Follow The Crowd — notification dedupe must not collapse different content
-- Run in Supabase SQL Editor. Idempotent: safe to re-run.
--
-- Problem: create_notification deduped unread notifications on
-- (user_id, type, title, link) within 10 minutes and returned the existing row
-- WITHOUT inserting a new one. Crew chat push title is "<sender> · <event>" and
-- link is the crew chat link -- BOTH constant for every message a sender posts
-- to that chat, regardless of content. So a second unread message from the same
-- sender to the same crew chat within 10 minutes (e.g. a text, then a photo)
-- collided with the dedupe key, returned the first message's existing
-- notification id, never inserted a row, and therefore never fired the
-- push-send webhook (which only triggers on INSERT into public.notifications).
-- Net effect: the second message produced no push at all -- reproduced exactly
-- as "crew text push arrives, crew image push (sent shortly after) does not."
--
-- Fix: also require the body to match before treating a notification as a
-- redundant repeat. Two messages with different previews/photo counts now
-- always insert (and push); two calls with genuinely identical title+body+link
-- within the window still collapse into one, unchanged from before.
--
-- Recipient/type/link authorization guards below are copied verbatim from
-- 20250730120000_reaction_notification_lifecycle.sql -- only the dedupe SELECT
-- (originally: this file's own predecessor) changes.

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

  -- Reaction notifications: keyed by reaction row, so an emoji change updates
  -- in place. Unaffected by the dedupe fix below -- unchanged from before.
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

  -- Dedupe now also requires the body to match -- only a genuinely identical
  -- repeat collapses into the existing row; different content (a new message,
  -- a new photo count, a new status change) always inserts and pushes.
  select n.id
    into v_notification_id
  from public.notifications n
  where n.user_id = p_user_id
    and n.type = p_type
    and n.title = p_title
    and n.body is not distinct from p_body
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
