-- Follow The Crowd — message-identity dedupe for DM/crew-chat attachment pushes
-- Run in Supabase SQL Editor. Idempotent: safe to re-run.
--
-- Problem: the previous fix (20260816000000) made the content-based dedupe
-- also require the body to match, not just title+link -- correct for two
-- messages with genuinely DIFFERENT content (a text then a photo), but two
-- separate image-only sends with no caption both render the exact same
-- generic body ("Sent a photo"), and DM push title ("<sender>") / crew push
-- title ("<sender> · <event>") are already constant per sender+thread. So a
-- second image-only message sent while the first is still unread STILL
-- collided under body-inclusive dedupe: same user_id, type, title, body,
-- link -- matched the existing unread row, returned its id without
-- inserting, and push-send (INSERT-only trigger) never fired for it. This
-- reproduces exactly "DM/crew image-only push never arrives, text does."
--
-- Fix: give message-type notifications a real identity to key on -- the
-- actual chat message that triggered them (public.messages.id) -- instead of
-- relying on title/body/link as a content fingerprint. When a caller passes
-- p_message_id, dedupe is scoped to (user_id, message_id): a genuine
-- accidental double-call for the SAME message still collapses (idempotent),
-- but two DIFFERENT messages always get their own row and push, no matter
-- how similar their rendered preview text is. Callers that don't have a real
-- message row (booking_request, booking_update, event-schedule-change,
-- run-sheet updates, crew-chat-ready) don't pass it and keep the unchanged
-- content-based dedupe from the prior migration. Reaction notifications
-- (keyed by reaction_id) are completely unaffected -- untouched branch,
-- still returns before reaching either dedupe path.

alter table public.notifications
  add column if not exists message_id uuid;

create index if not exists notifications_message_id_idx
  on public.notifications (message_id)
  where message_id is not null;

-- Adding a parameter changes the signature -- CREATE OR REPLACE cannot widen
-- an existing function's arguments, it would silently create a second
-- overload instead (the exact "Could not choose the best candidate
-- function" failure mode this codebase has hit before). Drop the old 6-arg
-- signature first.
drop function if exists public.create_notification(text, text, text, text, text, uuid);

create or replace function public.create_notification(
  p_user_id text,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_reaction_id uuid default null,
  p_message_id uuid default null
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
  -- in place. Unaffected by anything below -- unchanged from before.
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

  -- Message-identity notifications: a real chat message (DM/crew text or
  -- image) always gets its own notification+push regardless of how similar
  -- its title/body/link are to a recent one. Idempotent per (user_id,
  -- message_id) so a genuine accidental double-call for the SAME message
  -- still collapses rather than double-pushing.
  if p_message_id is not null then
    select n.id
      into v_notification_id
    from public.notifications n
    where n.user_id = p_user_id
      and n.message_id = p_message_id
    limit 1;

    if v_notification_id is not null then
      return v_notification_id;
    end if;

    insert into public.notifications (user_id, type, title, body, link, read, message_id)
    values (p_user_id, p_type, p_title, p_body, p_link, false, p_message_id)
    returning id into v_notification_id;

    return v_notification_id;
  end if;

  -- Content-based dedupe for everything else (booking_request,
  -- booking_update, and message-type calls with no real message row --
  -- event-schedule-change, run-sheet updates, crew-chat-ready). Unchanged
  -- from 20260816000000.
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

revoke all on function public.create_notification(text, text, text, text, text, uuid, uuid) from public;
grant execute on function public.create_notification(text, text, text, text, text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
