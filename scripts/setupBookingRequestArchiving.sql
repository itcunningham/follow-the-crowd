-- Adds archived_at to booking_requests and secure archive/unarchive RPCs.
-- Run in Supabase SQL Editor after setupBookingCancellation.sql.

alter table public.booking_requests
  add column if not exists archived_at timestamptz null;

-- Sender can archive/unarchive their own cancelled requests.
drop policy if exists "booking_requests_update_sender_archive" on public.booking_requests;

create policy "booking_requests_update_sender_archive"
  on public.booking_requests
  for update
  to authenticated
  using (
    sender_id = public.auth_user_id()
    and status = 'cancelled'
  )
  with check (
    sender_id = public.auth_user_id()
    and status = 'cancelled'
  );

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
    and sender_id = v_user_id
    and status = 'cancelled'
    and archived_at is null
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or cannot be archived';
  end if;

  return to_jsonb(v_booking);
end;
$$;

create or replace function public.unarchive_booking_request(p_booking_id uuid)
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
  set archived_at = null
  where id = p_booking_id
    and sender_id = v_user_id
    and status = 'cancelled'
    and archived_at is not null
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or cannot be restored';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.archive_booking_request(uuid) from public;
grant execute on function public.archive_booking_request(uuid) to authenticated;

revoke all on function public.unarchive_booking_request(uuid) from public;
grant execute on function public.unarchive_booking_request(uuid) to authenticated;

notify pgrst, 'reload schema';
