-- Per-user booking history hides (DJ Gigs History and planner sent History).
-- Idempotent. Safe to paste and run once in Supabase SQL Editor on production.
-- Prerequisites: setupBookingRequests.sql, setupBookingCancellation.sql,
-- setupBookingRequestArchiving.sql

create table if not exists public.booking_request_history_hides (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests (id) on delete cascade,
  user_id text not null,
  hidden_at timestamptz not null default now(),
  constraint booking_request_history_hides_booking_user_key unique (booking_request_id, user_id)
);

comment on table public.booking_request_history_hides is
  'Per-user hides for booking requests in History views. Does not delete bookings or affect other participants.';

create index if not exists booking_request_history_hides_user_id_idx
  on public.booking_request_history_hides (user_id);

create index if not exists booking_request_history_hides_booking_request_id_idx
  on public.booking_request_history_hides (booking_request_id);

alter table public.booking_request_history_hides enable row level security;

drop policy if exists "booking_request_history_hides_select_own" on public.booking_request_history_hides;
drop policy if exists "booking_request_history_hides_insert_own" on public.booking_request_history_hides;
drop policy if exists "booking_request_history_hides_delete_own" on public.booking_request_history_hides;

create policy "booking_request_history_hides_select_own"
  on public.booking_request_history_hides
  for select
  to authenticated
  using (user_id = public.auth_user_id());

create policy "booking_request_history_hides_insert_own"
  on public.booking_request_history_hides
  for insert
  to authenticated
  with check (user_id = public.auth_user_id());

create policy "booking_request_history_hides_delete_own"
  on public.booking_request_history_hides
  for delete
  to authenticated
  using (user_id = public.auth_user_id());

create or replace function public.hide_booking_request_from_history(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_booking public.booking_requests;
  v_hide public.booking_request_history_hides;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_booking_id is null then
    raise exception 'Invalid booking id';
  end if;

  select *
  into v_booking
  from public.booking_requests
  where id = p_booking_id
    and (sender_id = v_user_id or recipient_id = v_user_id);

  if not found then
    raise exception 'Booking request not found or cannot be hidden from history';
  end if;

  if v_booking.sender_id = v_user_id then
    if v_booking.status <> 'cancelled' then
      raise exception 'Booking request not found or cannot be hidden from history';
    end if;
  elsif v_booking.recipient_id = v_user_id then
    if v_booking.status not in ('declined', 'cancelled', 'accepted') then
      raise exception 'Booking request not found or cannot be hidden from history';
    end if;
  end if;

  insert into public.booking_request_history_hides (booking_request_id, user_id)
  values (p_booking_id, v_user_id)
  on conflict (booking_request_id, user_id) do nothing
  returning * into v_hide;

  if v_hide.id is null then
    select *
    into v_hide
    from public.booking_request_history_hides
    where booking_request_id = p_booking_id
      and user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'booking_request_id',
    p_booking_id,
    'hidden_at',
    v_hide.hidden_at
  );
end;
$$;

create or replace function public.hide_booking_requests_from_history(p_booking_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_booking_id uuid;
  v_updated_ids uuid[] := '{}';
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_booking_ids is null or cardinality(p_booking_ids) = 0 then
    return jsonb_build_object('updated_ids', '[]'::jsonb);
  end if;

  foreach v_booking_id in array p_booking_ids loop
    begin
      perform public.hide_booking_request_from_history(v_booking_id);
      v_updated_ids := array_append(v_updated_ids, v_booking_id);
    exception
      when others then
        null;
    end;
  end loop;

  return jsonb_build_object(
    'updated_ids',
    to_jsonb(v_updated_ids)
  );
end;
$$;

-- Restore sender-only archive semantics. Recipient history hides use booking_request_history_hides.
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

revoke all on function public.hide_booking_request_from_history(uuid) from public;
grant execute on function public.hide_booking_request_from_history(uuid) to authenticated;

revoke all on function public.hide_booking_requests_from_history(uuid[]) from public;
grant execute on function public.hide_booking_requests_from_history(uuid[]) to authenticated;

revoke all on function public.archive_booking_request(uuid) from public;
grant execute on function public.archive_booking_request(uuid) to authenticated;

notify pgrst, 'reload schema';
