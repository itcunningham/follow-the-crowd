-- Booking rate proposal flow: open offers and DJ counter-rates.
-- Run in Supabase SQL Editor after setupAcceptedBookingCancellation.sql.

alter table public.booking_requests
  add column if not exists rate_mode text not null default 'fixed',
  add column if not exists proposed_rate integer null,
  add column if not exists proposed_rate_note text null,
  add column if not exists proposed_rate_at timestamptz null,
  add column if not exists proposed_rate_status text null;

alter table public.booking_requests
  drop constraint if exists booking_requests_rate_mode_check;

alter table public.booking_requests
  add constraint booking_requests_rate_mode_check
  check (rate_mode in ('fixed', 'open'));

alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_status_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_status_check
  check (proposed_rate_status is null or proposed_rate_status in ('pending', 'accepted', 'declined'));

alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_note_length_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_note_length_check
  check (proposed_rate_note is null or char_length(proposed_rate_note) <= 250);

create or replace function public.propose_booking_rate(
  p_booking_id uuid,
  p_proposed_rate integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_booking public.booking_requests;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_booking_id is null then
    raise exception 'Invalid booking id';
  end if;

  if p_proposed_rate is null or p_proposed_rate <= 0 then
    raise exception 'Proposed rate must be a positive whole dollar amount';
  end if;

  if v_note is not null and char_length(v_note) > 250 then
    raise exception 'Proposal note must be 250 characters or fewer';
  end if;

  update public.booking_requests
  set
    proposed_rate = p_proposed_rate,
    proposed_rate_note = v_note,
    proposed_rate_at = now(),
    proposed_rate_status = 'pending'
  where id = p_booking_id
    and recipient_id = v_user_id
    and status = 'pending'
    and rate_mode = 'open'
    and (proposed_rate_status is null or proposed_rate_status = 'declined')
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or rate proposal is not allowed';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.propose_booking_rate(uuid, integer, text) from public;
grant execute on function public.propose_booking_rate(uuid, integer, text) to authenticated;

create or replace function public.accept_proposed_booking_rate(p_booking_id uuid)
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
  set
    fee = proposed_rate::text,
    status = 'accepted',
    proposed_rate_status = 'accepted'
  where id = p_booking_id
    and sender_id = v_user_id
    and status = 'pending'
    and proposed_rate_status = 'pending'
    and proposed_rate is not null
    and proposed_rate > 0
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or proposed rate cannot be accepted';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.accept_proposed_booking_rate(uuid) from public;
grant execute on function public.accept_proposed_booking_rate(uuid) to authenticated;

create or replace function public.decline_proposed_booking_rate(p_booking_id uuid)
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
  set
    proposed_rate = null,
    proposed_rate_note = null,
    proposed_rate_at = null,
    proposed_rate_status = 'declined'
  where id = p_booking_id
    and sender_id = v_user_id
    and status = 'pending'
    and proposed_rate_status = 'pending'
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or proposed rate cannot be declined';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.decline_proposed_booking_rate(uuid) from public;
grant execute on function public.decline_proposed_booking_rate(uuid) to authenticated;

create or replace function public.create_notification(
  p_user_id text,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
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
        and br.proposed_rate_status = 'pending'
      )
      or (
        br.sender_id = v_sender_id
        and br.recipient_id = p_user_id
        and br.status = 'accepted'
        and br.proposed_rate_status = 'accepted'
      )
    ) then
      raise exception 'Not allowed to create booking_update notification';
    end if;
  end if;

  insert into public.notifications (user_id, type, title, body, link, read)
  values (p_user_id, p_type, p_title, p_body, p_link, false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification(text, text, text, text, text) from public;
grant execute on function public.create_notification(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
