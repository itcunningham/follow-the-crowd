-- Idempotent migration: prevent duplicate active event-linked booking requests.
-- Run in Supabase SQL Editor after setupEvents.sql and setupBookingCancellation.sql.
--
-- Protects one pending OR accepted booking per (event_id, recipient_id).
-- Does NOT block:
--   - declined rows (re-send blocked client-side only)
--   - cancelled rows (re-send allowed after cancel)
--   - archived rows (archived_at is separate from this index)
--   - custom bookings without event_id

-- Remove duplicate active rows before creating the unique index (keeps oldest).
with ranked as (
  select
    id,
    row_number() over (
      partition by event_id, recipient_id
      order by created_at asc, id asc
    ) as rn
  from public.booking_requests
  where event_id is not null
    and status in ('pending', 'accepted')
)
delete from public.booking_requests br
using ranked
where br.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists booking_requests_active_event_recipient_idx
  on public.booking_requests (event_id, recipient_id)
  where event_id is not null
    and status in ('pending', 'accepted');

notify pgrst, 'reload schema';
