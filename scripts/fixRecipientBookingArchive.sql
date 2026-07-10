-- Allow DJs to archive received gigs from Gigs history.
-- LEGACY: superseded by supabase/migrations/20250710130000_booking_request_history_hides.sql
-- Do not run on new deploys. Recipient Remove from history uses per-user booking_request_history_hides.
-- Run in Supabase SQL Editor after setupBookingRequestArchiving.sql.

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
    and archived_at is null
    and (
      (sender_id = v_user_id and status = 'cancelled')
      or (
        recipient_id = v_user_id
        and status in ('declined', 'cancelled', 'accepted')
      )
    )
  returning * into v_booking;

  if not found then
    raise exception 'Booking request not found or cannot be archived';
  end if;

  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.archive_booking_request(uuid) from public;
grant execute on function public.archive_booking_request(uuid) to authenticated;

notify pgrst, 'reload schema';
