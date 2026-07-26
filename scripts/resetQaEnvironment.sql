-- =============================================================================
-- FTC Beta Environment Reset
-- =============================================================================
--
-- Single script: wipe transactional QA/test data, clear QA storage artifacts,
-- normalise permanent QA profiles, and verify a fresh-install state.
--
-- Safe to re-run (idempotent).
--
-- PRESERVES: auth.users, public.users (avatars, core identity), RLS, RPCs, app
--            configuration, profile-images bucket (QA avatars kept).
--
-- REMOVES: events, plans, bookings, DMs, crew chat, notifications, calendar
--          rows, hides, blocks, dm-attachments + event-covers storage objects.
--
-- Does NOT create auth users — sign up in the app first, then run this script.
-- See docs/qa/FTC-BETA-ENVIRONMENT-RESET.md for the step-by-step runbook.
--
-- Dry-run: change the final COMMIT in Part 1 to ROLLBACK.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part 0 — Optional email map (fill once if profiles lack FTC QA display names)
-- Copy emails from .env.qa.local. Leave blank to skip auth.email linking.
-- -----------------------------------------------------------------------------

create temp table if not exists _qa_email_map (
  display_name text primary key,
  email text not null default ''
);

truncate _qa_email_map;

insert into _qa_email_map (display_name, email) values
  ('FTC QA Planner', ''),  -- FTC_QA_PLANNER_EMAIL
  ('FTC QA DJ', ''),       -- FTC_QA_DJ_EMAIL (E2E default DJ)
  ('FTC QA DJ 1', ''),     -- optional: ftc.qa.dj1@…
  ('FTC QA DJ 2', ''),     -- optional: ftc.qa.dj2@…
  ('FTC QA DJ 3', ''),     -- optional: ftc.qa.dj3@…
  ('FTC QA Both', '');     -- FTC_QA_BOTH_EMAIL

-- -----------------------------------------------------------------------------
-- Part 1 — Transactional data cleanup (FK-safe order)
-- -----------------------------------------------------------------------------

begin;

delete from public.user_reports;
delete from public.message_reactions;
delete from public.message_attachments;
delete from public.message_reads;
delete from public.booking_request_history_hides;
delete from public.notifications;
delete from public.messages;
delete from public.event_run_sheet_rows;
delete from public.event_run_sheet_columns;
delete from public.booking_requests;
delete from public.events;
delete from public.booking_plans;
delete from public.conversation_members;
delete from public.conversations;
delete from public.dj_availability;
delete from public.user_blocks;

commit;

-- UUID primary keys (gen_random_uuid) — no serial sequences to reset.

-- -----------------------------------------------------------------------------
-- Part 2 — QA storage cleanup (keeps profile-images / avatars)
-- -----------------------------------------------------------------------------

delete from storage.objects
where bucket_id in ('dm-attachments', 'event-covers');

-- -----------------------------------------------------------------------------
-- Part 3 — Clear profile text that referenced deleted transactional data
-- (avatars, display names, roles, and usernames are kept unless re-seeded below)
-- -----------------------------------------------------------------------------

update public.users u
set
  dj_past_gigs = '',
  promoter_venues_used = '',
  promoter_upcoming_events = '',
  promoter_past_events = '',
  dj_availability = '',
  deleted_at = null
where u.display_name in (
  'FTC QA Planner',
  'FTC QA DJ',
  'FTC QA DJ 1',
  'FTC QA DJ 2',
  'FTC QA DJ 3',
  'FTC QA Both'
)
or u.user_id in (
  select au.id::text
  from auth.users au
  join _qa_email_map m
    on lower(trim(au.email)) = lower(trim(m.email))
  where m.email <> ''
);

-- -----------------------------------------------------------------------------
-- Part 4 — Seed / normalise permanent QA profiles (realistic beta defaults)
-- -----------------------------------------------------------------------------

with qa_seed as (
  select *
  from (
    values
      (
        'FTC QA Planner'::text,
        'promoter'::text,
        'ftcqa_planner'::text,
        'Coached beta planner account for Follow The Crowd QA.'::text,
        null::text,
        'Melbourne'::text,
        null::text,
        'FTC QA Events'::text,
        'Underground events and curated DJ bookings for beta testing.'::text
      ),
      (
        'FTC QA DJ'::text,
        'dj'::text,
        'ftcqa_dj'::text,
        'Primary E2E DJ account — house and disco sets.'::text,
        'house'::text,
        'Melbourne'::text,
        'FTC QA DJ'::text,
        null::text,
        null::text
      ),
      (
        'FTC QA DJ 1'::text,
        'dj'::text,
        'ftcqa_dj1'::text,
        'Techno and peak-time warehouse energy — QA DJ 1.'::text,
        'techno'::text,
        'Melbourne'::text,
        'QA DJ One'::text,
        null::text,
        null::text
      ),
      (
        'FTC QA DJ 2'::text,
        'dj'::text,
        'ftcqa_dj2'::text,
        'House, disco, and club grooves — QA DJ 2.'::text,
        'house'::text,
        'Melbourne'::text,
        'QA DJ Two'::text,
        null::text,
        null::text
      ),
      (
        'FTC QA DJ 3'::text,
        'dj'::text,
        'ftcqa_dj3'::text,
        'Drum & bass and breakbeat selections — QA DJ 3.'::text,
        'drum and bass'::text,
        'Melbourne'::text,
        'QA DJ Three'::text,
        null::text,
        null::text
      ),
      (
        'FTC QA Both'::text,
        'both'::text,
        'ftcqa_both'::text,
        'Dual-role QA account — plans events and plays DJ sets.'::text,
        'eclectic'::text,
        'Melbourne'::text,
        'FTC QA Both'::text,
        'FTC QA Dual'::text,
        'Planner and DJ workflows for beta parity testing.'::text
      )
  ) as v(
    display_name,
    role,
    username,
    bio,
    genre,
    location,
    artist_name,
    promoter_brand_name,
    promoter_brand_description
  )
),
auth_linked as (
  select
    au.id::text as user_id,
    s.display_name,
    s.role,
    s.username,
    s.bio,
    s.genre,
    s.location,
    s.artist_name,
    s.promoter_brand_name,
    s.promoter_brand_description
  from auth.users au
  join _qa_email_map m
    on lower(trim(au.email)) = lower(trim(m.email))
  join qa_seed s
    on s.display_name = m.display_name
  where m.email <> ''
)
insert into public.users (
  user_id,
  role,
  onboarding_complete,
  display_name,
  username,
  bio,
  genre,
  location,
  artist_name,
  promoter_brand_name,
  promoter_brand_description
)
select
  user_id,
  role,
  true,
  display_name,
  username,
  bio,
  genre,
  location,
  artist_name,
  promoter_brand_name,
  promoter_brand_description
from auth_linked
on conflict (user_id) do update set
  role = excluded.role,
  onboarding_complete = true,
  display_name = excluded.display_name,
  username = excluded.username,
  bio = excluded.bio,
  genre = excluded.genre,
  location = excluded.location,
  artist_name = excluded.artist_name,
  promoter_brand_name = excluded.promoter_brand_name,
  promoter_brand_description = excluded.promoter_brand_description,
  deleted_at = null;

with qa_seed as (
  select *
  from (
    values
      ('FTC QA Planner', 'promoter', 'ftcqa_planner', 'Coached beta planner account for Follow The Crowd QA.', null, 'Melbourne', null, 'FTC QA Events', 'Underground events and curated DJ bookings for beta testing.'),
      ('FTC QA DJ', 'dj', 'ftcqa_dj', 'Primary E2E DJ account — house and disco sets.', 'house', 'Melbourne', 'FTC QA DJ', null, null),
      ('FTC QA DJ 1', 'dj', 'ftcqa_dj1', 'Techno and peak-time warehouse energy — QA DJ 1.', 'techno', 'Melbourne', 'QA DJ One', null, null),
      ('FTC QA DJ 2', 'dj', 'ftcqa_dj2', 'House, disco, and club grooves — QA DJ 2.', 'house', 'Melbourne', 'QA DJ Two', null, null),
      ('FTC QA DJ 3', 'dj', 'ftcqa_dj3', 'Drum & bass and breakbeat selections — QA DJ 3.', 'drum and bass', 'Melbourne', 'QA DJ Three', null, null),
      ('FTC QA Both', 'both', 'ftcqa_both', 'Dual-role QA account — plans events and plays DJ sets.', 'eclectic', 'Melbourne', 'FTC QA Both', 'FTC QA Dual', 'Planner and DJ workflows for beta parity testing.')
  ) as v(display_name, role, username, bio, genre, location, artist_name, promoter_brand_name, promoter_brand_description)
)
update public.users u
set
  role = s.role,
  onboarding_complete = true,
  username = s.username,
  bio = s.bio,
  genre = s.genre,
  location = s.location,
  artist_name = s.artist_name,
  promoter_brand_name = s.promoter_brand_name,
  promoter_brand_description = s.promoter_brand_description,
  dj_past_gigs = '',
  promoter_venues_used = '',
  promoter_upcoming_events = '',
  promoter_past_events = '',
  dj_availability = '',
  deleted_at = null
from qa_seed s
where u.display_name = s.display_name;

-- -----------------------------------------------------------------------------
-- Part 5 — Verification (expect 0 transactional rows; QA accounts listed)
-- -----------------------------------------------------------------------------

select 'user_reports' as table_name, count(*) as row_count from public.user_reports
union all select 'message_reactions', count(*) from public.message_reactions
union all select 'message_attachments', count(*) from public.message_attachments
union all select 'message_reads', count(*) from public.message_reads
union all select 'booking_request_history_hides', count(*) from public.booking_request_history_hides
union all select 'notifications', count(*) from public.notifications
union all select 'messages', count(*) from public.messages
union all select 'event_run_sheet_rows', count(*) from public.event_run_sheet_rows
union all select 'event_run_sheet_columns', count(*) from public.event_run_sheet_columns
union all select 'booking_requests', count(*) from public.booking_requests
union all select 'events', count(*) from public.events
union all select 'booking_plans', count(*) from public.booking_plans
union all select 'conversation_members', count(*) from public.conversation_members
union all select 'conversations', count(*) from public.conversations
union all select 'dj_availability', count(*) from public.dj_availability
union all select 'user_blocks', count(*) from public.user_blocks
union all select 'storage:dm-attachments', count(*) from storage.objects where bucket_id = 'dm-attachments'
union all select 'storage:event-covers', count(*) from storage.objects where bucket_id = 'event-covers'
order by table_name;

select 'orphan message_attachments' as integrity_check, count(*) as row_count
from public.message_attachments ma
left join public.messages m on m.id = ma.message_id
where m.id is null
union all
select 'orphan message_reads', count(*)
from public.message_reads mr
left join public.conversations c on c.id = mr.conversation_id
where c.id is null
union all
select 'orphan booking history hides', count(*)
from public.booking_request_history_hides h
left join public.booking_requests br on br.id = h.booking_request_id
where br.id is null;

select
  u.user_id,
  u.display_name,
  u.username,
  u.role,
  u.onboarding_complete,
  au.email as auth_email
from public.users u
left join auth.users au on au.id::text = u.user_id
where u.display_name in (
  'FTC QA Planner',
  'FTC QA DJ',
  'FTC QA DJ 1',
  'FTC QA DJ 2',
  'FTC QA DJ 3',
  'FTC QA Both'
)
order by u.display_name;

select
  m.display_name as missing_qa_account,
  case when m.email = '' then 'no email mapped — sign up in app then re-run' else 'auth user not found for mapped email' end as action
from _qa_email_map m
left join public.users u on u.display_name = m.display_name
where u.user_id is null
order by m.display_name;

-- -----------------------------------------------------------------------------
-- STOP — MANUAL RUN ONLY (Supabase SQL Editor)
-- profile-images bucket is intentionally preserved (QA avatars).
-- For auth signup steps see docs/qa/FTC-BETA-ENVIRONMENT-RESET.md
-- -----------------------------------------------------------------------------
