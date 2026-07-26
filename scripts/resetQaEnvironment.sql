-- =============================================================================
-- FTC QA Environment Reset — paste this entire file into Supabase SQL Editor → Run
-- =============================================================================
--
-- Wipes all transactional data, clears QA storage artifacts, and normalises
-- permanent QA profiles. Safe to re-run.
--
-- QA accounts are detected automatically (no email editing required):
--   • display_name starts with "FTC QA"
--   • username starts with "ftcqa_"
--   • auth email local-part starts with ftcqa, ftc.qa, or ftc_qa
--
-- PRESERVES: auth.users, avatars (profile-images), RLS, app configuration.
-- Runbook: docs/qa/FTC-BETA-ENVIRONMENT-RESET.md

-- ---------------------------------------------------------------------------
-- QA profile definitions (single source)
-- ---------------------------------------------------------------------------

create temp table _qa_seed (
  display_name text primary key,
  role text not null,
  username text not null,
  bio text not null,
  genre text,
  location text not null,
  artist_name text,
  promoter_brand_name text,
  promoter_brand_description text
);

insert into _qa_seed values
  ('FTC QA Planner', 'promoter', 'ftcqa_planner', 'Coached beta planner account for Follow The Crowd QA.', null, 'Melbourne', null, 'FTC QA Events', 'Underground events and curated DJ bookings for beta testing.'),
  ('FTC QA DJ', 'dj', 'ftcqa_dj', 'Primary E2E DJ account — house and disco sets.', 'house', 'Melbourne', 'FTC QA DJ', null, null),
  ('FTC QA DJ 1', 'dj', 'ftcqa_dj1', 'Techno and peak-time warehouse energy — QA DJ 1.', 'techno', 'Melbourne', 'QA DJ One', null, null),
  ('FTC QA DJ 2', 'dj', 'ftcqa_dj2', 'House, disco, and club grooves — QA DJ 2.', 'house', 'Melbourne', 'QA DJ Two', null, null),
  ('FTC QA DJ 3', 'dj', 'ftcqa_dj3', 'Drum & bass and breakbeat selections — QA DJ 3.', 'drum and bass', 'Melbourne', 'QA DJ Three', null, null),
  ('FTC QA Both', 'both', 'ftcqa_both', 'Dual-role QA account — plans events and plays DJ sets.', 'eclectic', 'Melbourne', 'FTC QA Both', 'FTC QA Dual', 'Planner and DJ workflows for beta parity testing.');

-- ---------------------------------------------------------------------------
-- Auto-detect QA auth users (no manual email map)
-- ---------------------------------------------------------------------------

create temp table _qa_detected as
with auth_with_local as (
  select
    au.id::text as user_id,
    au.email,
    lower(split_part(au.email, '@', 1)) as email_local
  from auth.users au
),
inferred as (
  select
    awl.user_id,
    awl.email,
    awl.email_local,
    case
      when awl.email_local ~ 'planner|ftcqa[_-]?planner' then 'FTC QA Planner'
      when awl.email_local ~ 'dj3|ftcqa[_-]?dj3' then 'FTC QA DJ 3'
      when awl.email_local ~ 'dj2|ftcqa[_-]?dj2' then 'FTC QA DJ 2'
      when awl.email_local ~ 'dj1|ftcqa[_-]?dj1' then 'FTC QA DJ 1'
      when awl.email_local ~ 'both|ftcqa[_-]?both' then 'FTC QA Both'
      when awl.email_local ~ '(^|[._-])dj([._-]|$)|ftcqa[_-]?dj$' then 'FTC QA DJ'
      else null
    end as inferred_display_name
  from auth_with_local awl
)
select distinct on (i.user_id)
  i.user_id,
  i.email,
  coalesce(
    case when u.display_name like 'FTC QA%' then u.display_name end,
    i.inferred_display_name
  ) as resolved_display_name
from inferred i
left join public.users u on u.user_id = i.user_id
where u.display_name like 'FTC QA%'
   or u.username like 'ftcqa_%'
   or i.email_local like 'ftcqa%'
   or i.email_local like 'ftc.qa%'
   or i.email_local like 'ftc_qa%'
order by i.user_id;

-- ---------------------------------------------------------------------------
-- 1. Transactional cleanup
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2. QA storage cleanup (avatars preserved in profile-images)
-- ---------------------------------------------------------------------------

delete from storage.objects
where bucket_id in ('dm-attachments', 'event-covers');

-- ---------------------------------------------------------------------------
-- 3. Clear stale profile text on detected QA accounts
-- ---------------------------------------------------------------------------

update public.users u
set
  dj_past_gigs = '',
  promoter_venues_used = '',
  promoter_upcoming_events = '',
  promoter_past_events = '',
  dj_availability = '',
  deleted_at = null
where u.user_id in (select user_id from _qa_detected where resolved_display_name is not null)
   or u.display_name like 'FTC QA%'
   or u.username like 'ftcqa_%';

-- ---------------------------------------------------------------------------
-- 4. Upsert / normalise QA profiles
-- ---------------------------------------------------------------------------

insert into public.users (
  user_id, role, onboarding_complete, display_name, username, bio, genre, location,
  artist_name, promoter_brand_name, promoter_brand_description
)
select
  d.user_id,
  s.role,
  true,
  s.display_name,
  s.username,
  s.bio,
  s.genre,
  s.location,
  s.artist_name,
  s.promoter_brand_name,
  s.promoter_brand_description
from _qa_detected d
join _qa_seed s on s.display_name = d.resolved_display_name
where d.resolved_display_name is not null
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
  dj_past_gigs = '',
  promoter_venues_used = '',
  promoter_upcoming_events = '',
  promoter_past_events = '',
  dj_availability = '',
  deleted_at = null;

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
from _qa_seed s
where u.display_name = s.display_name;

-- ---------------------------------------------------------------------------
-- 5. Verification
-- ---------------------------------------------------------------------------

select '--- transactional counts (expect 0) ---' as section;

select 'user_reports' as table_name, count(*) as row_count from public.user_reports
union all select 'booking_requests', count(*) from public.booking_requests
union all select 'events', count(*) from public.events
union all select 'booking_plans', count(*) from public.booking_plans
union all select 'messages', count(*) from public.messages
union all select 'conversations', count(*) from public.conversations
union all select 'notifications', count(*) from public.notifications
union all select 'dj_availability', count(*) from public.dj_availability
union all select 'user_blocks', count(*) from public.user_blocks
union all select 'storage:dm-attachments', count(*) from storage.objects where bucket_id = 'dm-attachments'
union all select 'storage:event-covers', count(*) from storage.objects where bucket_id = 'event-covers'
order by table_name;

select '--- QA accounts (expect your permanent set) ---' as section;

select
  u.user_id,
  u.display_name,
  u.username,
  u.role,
  u.onboarding_complete,
  au.email as auth_email
from public.users u
left join auth.users au on au.id::text = u.user_id
where u.display_name like 'FTC QA%'
   or u.username like 'ftcqa_%'
   or u.user_id in (select user_id from _qa_detected)
order by u.display_name;

select '--- expected but not found (sign up in app, then re-run) ---' as section;

select s.display_name as missing_account
from _qa_seed s
left join public.users u on u.display_name = s.display_name
where u.user_id is null
order by s.display_name;
