-- Fix duplicate auto-generated run sheet rows for accepted bookings.
-- Run in Supabase SQL Editor after setupEventRunSheet.sql.

alter table public.event_run_sheet_rows
  add column if not exists booking_request_id uuid references public.booking_requests (id) on delete set null;

create index if not exists event_run_sheet_rows_booking_request_id_idx
  on public.event_run_sheet_rows (booking_request_id);

-- Backfill booking_request_id from accepted booking_requests using stored recipient id.
update public.event_run_sheet_rows r
set booking_request_id = br.id
from public.booking_requests br
where r.booking_request_id is null
  and r.event_id = br.event_id
  and br.status = 'accepted'
  and br.recipient_id = coalesce(r.custom_data->>'booking_recipient_id', '');

-- Remove duplicate auto-generated rows, keeping the oldest row per event + booking request.
delete from public.event_run_sheet_rows r
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by event_id, booking_request_id
        order by created_at asc, id asc
      ) as row_number
    from public.event_run_sheet_rows
    where booking_request_id is not null
  ) ranked
  where ranked.row_number > 1
) duplicates
where r.id = duplicates.id;

-- Legacy duplicates keyed only by recipient id in custom_data.
delete from public.event_run_sheet_rows r
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by event_id, custom_data->>'booking_recipient_id'
        order by created_at asc, id asc
      ) as row_number
    from public.event_run_sheet_rows
    where booking_request_id is null
      and coalesce(custom_data->>'booking_recipient_id', '') <> ''
  ) ranked
  where ranked.row_number > 1
) duplicates
where r.id = duplicates.id;

create unique index if not exists event_run_sheet_rows_event_booking_request_uidx
  on public.event_run_sheet_rows (event_id, booking_request_id)
  where booking_request_id is not null;

notify pgrst, 'reload schema';
