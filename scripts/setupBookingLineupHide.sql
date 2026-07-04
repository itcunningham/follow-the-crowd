-- Adds lineup_hidden_at to booking_requests and secure hide-from-lineup RPC.
-- Run in Supabase SQL Editor after setupBookingCancellation.sql.

alter table public.booking_requests
  add column if not exists lineup_hidden_at timestamptz null;

-- Sender can hide their own declined event lineup bookings from the event page.
drop policy if exists "booking_requests_update_sender_lineup_hide" on public.booking_requests;

create policy "booking_requests_update_sender_lineup_hide"
  on public.booking_requests
  for update
  to authenticated
  using (
    sender_id = public.auth_user_id()
    and status = 'declined'
    and event_id is not null
  )
  with check (
    sender_id = public.auth_user_id()
    and status = 'declined'
    and event_id is not null
  );

create or replace function public.hide_declined_booking_from_lineup(p_booking_id uuid)
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
  set lineup_hidden_at = now()
  where id = p_booking_id
    and sender_id = v_user_id
    and status = 'declined'
    and event_id is not null
    and lineup_hidden_at is null
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or cannot be hidden from lineup';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.hide_declined_booking_from_lineup(uuid) from public;
grant execute on function public.hide_declined_booking_from_lineup(uuid) to authenticated;

notify pgrst, 'reload schema';
