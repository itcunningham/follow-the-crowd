-- Accepted booking cancellation / DJ withdrawal metadata and RPC updates.
-- Run in Supabase SQL Editor after setupBookingCancellation.sql.

alter table public.booking_requests
  add column if not exists cancelled_at timestamptz null,
  add column if not exists cancelled_by text null,
  add column if not exists cancellation_reason text null;

drop policy if exists "booking_requests_update_sender_cancel" on public.booking_requests;

create policy "booking_requests_update_sender_cancel"
  on public.booking_requests
  for update
  to authenticated
  using (
    sender_id = public.auth_user_id()
    and status in ('pending', 'accepted')
  )
  with check (
    sender_id = public.auth_user_id()
    and status = 'cancelled'
  );

drop policy if exists "booking_requests_update_recipient_withdraw" on public.booking_requests;

create policy "booking_requests_update_recipient_withdraw"
  on public.booking_requests
  for update
  to authenticated
  using (
    recipient_id = public.auth_user_id()
    and status = 'accepted'
  )
  with check (
    recipient_id = public.auth_user_id()
    and status = 'cancelled'
  );

create or replace function public.cancel_booking_request(
  p_booking_id uuid,
  p_cancellation_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_booking public.booking_requests;
  v_reason text := nullif(btrim(coalesce(p_cancellation_reason, '')), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_booking_id is null then
    raise exception 'Invalid booking id';
  end if;

  update public.booking_requests
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancellation_reason = v_reason
  where id = p_booking_id
    and sender_id = v_user_id
    and status = 'pending'
  returning * into v_booking;

  if not found then
    if v_reason is null then
      raise exception 'Cancellation reason is required';
    end if;

    update public.booking_requests
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_user_id,
      cancellation_reason = v_reason
    where id = p_booking_id
      and sender_id = v_user_id
      and status = 'accepted'
    returning * into v_booking;
  end if;

  if not found then
    update public.booking_requests
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_user_id,
      cancellation_reason = v_reason
    where id = p_booking_id
      and recipient_id = v_user_id
      and status = 'accepted'
    returning * into v_booking;
  end if;

  if not found then
    raise exception 'Booking request not found or cannot be cancelled';
  end if;

  delete from public.event_run_sheet_rows
  where booking_request_id = p_booking_id;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.cancel_booking_request(uuid, text) from public;
grant execute on function public.cancel_booking_request(uuid, text) to authenticated;

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
