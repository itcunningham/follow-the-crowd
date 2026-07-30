-- Follow The Crowd — reaction notification lifecycle (update on change, remove on delete)
-- Run in Supabase SQL Editor. Idempotent: safe to re-run.
--
-- Problem: reaction notifications had no stable key. create_notification deduped on
-- (user_id, type, title, link, read=false) within 10 minutes and returned the existing
-- row WITHOUT updating body, so changing ❤️ -> 😂 left the old emoji. There was also no
-- way to target a single reaction's notification on removal.
--
-- Fix: key reaction notifications by message_reactions.id, which is stable across an
-- emoji change (toggle UPDATEs the same row) and unique per (message_id, user_id) — so
-- targeting by it inherently affects only one reactor's notification.
--
-- Recipient determination is unchanged: all existing participant/self-notify guards remain.

alter table public.notifications
  add column if not exists reaction_id uuid;

create index if not exists notifications_reaction_id_idx
  on public.notifications (reaction_id)
  where reaction_id is not null;

-- Replace the 5-arg function with a 6-arg version whose new parameter defaults to null,
-- so existing 5-argument callers (normal messages, bookings) are unaffected.
drop function if exists public.create_notification(text, text, text, text, text);

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

  -- Reaction notifications: keyed by reaction row, so an emoji change updates in place.
  -- `read` is deliberately not reset, so a change does not re-trigger unread.
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

  -- Unchanged behaviour for every other notification type.
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

-- Remove the notification for a single reaction when that reaction is removed.
-- Caller must be a member of the conversation the notification points at.
create or replace function public.revoke_reaction_notification(p_reaction_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.auth_user_id();
  v_deleted integer := 0;
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  if p_reaction_id is null then
    return 0;
  end if;

  delete from public.notifications n
  where n.reaction_id = p_reaction_id
    and n.type = 'message'
    and n.link ~ '^/dm/[0-9a-fA-F-]{36}$'
    and public.is_conversation_member(
      substring(n.link from '^/dm/([0-9a-fA-F-]{36})$')::uuid
    );

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all on function public.revoke_reaction_notification(uuid) from public;
grant execute on function public.revoke_reaction_notification(uuid) to authenticated;

notify pgrst, 'reload schema';
