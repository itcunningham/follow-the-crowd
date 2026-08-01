-- =============================================================================
-- FTC QA Environment Reset — paste this entire file into Supabase SQL Editor → Run
-- =============================================================================
--
-- Removes transactional data belonging to detected QA accounts ONLY.
-- Non-QA users and their data are never touched. Safe to re-run (idempotent).
--
-- QA accounts are detected by: public.users.display_name starting with
-- "FTC QA", public.users.username starting with "ftcqa_", or an auth.users
-- email local-part starting with ftcqa / ftc.qa / ftc_qa.
--
-- Preserves: QA auth accounts, profiles, usernames, roles, avatars, RLS,
-- and all non-QA data. Runbook: docs/qa/FTC-BETA-ENVIRONMENT-RESET.md

-- One-time cleanup of a diagnostic table from an earlier version of this
-- script (no longer created) — no-op if it was never created.
drop table if exists public.qa_reset_log;

-- Safe to re-run in the same SQL Editor session (drops prior temp tables first).
drop table if exists _qa_seed;
drop table if exists _qa_detected;
drop table if exists _qa_user_ids;
drop table if exists _qa_events;
drop table if exists _qa_booking_plans;
drop table if exists _qa_booking_requests;
drop table if exists _qa_touch_conversations;
drop table if exists _qa_only_conversations;
drop table if exists _qa_messages;

-- ---------------------------------------------------------------------------
-- QA profile definitions (used to re-normalise profiles after cleanup)
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
-- Auto-detect QA auth users (source of truth for all scoping)
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

create temp table _qa_user_ids as
select user_id from _qa_detected;

-- ---------------------------------------------------------------------------
-- Derive QA-owned / QA-touching record sets (empty when no QA accounts found)
-- ---------------------------------------------------------------------------

create temp table _qa_events as
select e.id
from public.events e
where e.owner_id in (select user_id from _qa_user_ids);

create temp table _qa_booking_plans as
select bp.id
from public.booking_plans bp
where bp.owner_id in (select user_id from _qa_user_ids);

-- QA↔QA bookings, or bookings on QA-owned events. Bookings between a QA
-- account and a real (non-QA) user are intentionally preserved.
create temp table _qa_booking_requests as
select br.id
from public.booking_requests br
where (
  br.sender_id in (select user_id from _qa_user_ids)
  and br.recipient_id in (select user_id from _qa_user_ids)
)
or br.event_id in (select id from _qa_events);

create temp table _qa_touch_conversations as
select distinct cm.conversation_id
from public.conversation_members cm
where cm.user_id in (select user_id from _qa_user_ids);

-- Every member is a QA user — whole thread removed. A mixed QA/non-QA
-- thread is not in this set, so only the QA side is cleared below.
create temp table _qa_only_conversations as
select cm.conversation_id
from public.conversation_members cm
group by cm.conversation_id
having bool_and(cm.user_id in (select user_id from _qa_user_ids));

create temp table _qa_messages as
select m.id
from public.messages m
where (
  m.event_id is not null
  and btrim(m.event_id) ~ '^[0-9a-fA-F-]{36}$'
  and m.event_id::uuid in (select id from _qa_events)
)
or (
  m.event_id is not null
  and btrim(m.event_id) <> ''
  and m.user_id in (select user_id from _qa_user_ids)
)
or m.conversation_id in (select conversation_id from _qa_only_conversations)
or (
  m.conversation_id in (select conversation_id from _qa_touch_conversations)
  and m.user_id in (select user_id from _qa_user_ids)
);

-- ---------------------------------------------------------------------------
-- 1. Scoped transactional cleanup (FK-safe order; skips when _qa_user_ids empty)
-- ---------------------------------------------------------------------------

begin;

delete from public.user_reports ur
where ur.reporter_id in (select user_id from _qa_user_ids)
   or ur.reported_user_id in (select user_id from _qa_user_ids)
   or ur.conversation_id in (select conversation_id from _qa_only_conversations)
   or ur.message_id in (select id from _qa_messages);

delete from public.message_reactions mr
where mr.message_id in (select id from _qa_messages)
   or mr.user_id in (select user_id from _qa_user_ids);

delete from public.message_attachments ma
where ma.message_id in (select id from _qa_messages)
   or ma.uploader_id in (select user_id from _qa_user_ids)
   or ma.conversation_id in (select conversation_id from _qa_only_conversations);

delete from public.message_reads mr
where mr.user_id in (select user_id from _qa_user_ids)
   or mr.conversation_id in (select conversation_id from _qa_only_conversations)
   or mr.event_id in (select id from _qa_events);

delete from public.booking_request_history_hides h
where h.user_id in (select user_id from _qa_user_ids)
   or h.booking_request_id in (select id from _qa_booking_requests);

delete from public.notifications n
where n.user_id in (select user_id from _qa_user_ids)
   or (
     n.link ~ '^/dm/[0-9a-fA-F-]{36}$'
     and substring(n.link from '^/dm/([0-9a-fA-F-]{36})$')::uuid
       in (select conversation_id from _qa_only_conversations)
   )
   or (
     n.link ~ '^/events/[0-9a-fA-F-]{36}/chat$'
     and substring(n.link from '^/events/([0-9a-fA-F-]{36})/chat$')::uuid
       in (select id from _qa_events)
   );

delete from public.messages m
where m.id in (select id from _qa_messages);

delete from public.event_run_sheet_rows r
where r.event_id in (select id from _qa_events);

delete from public.event_run_sheet_columns c
where c.event_id in (select id from _qa_events);

delete from public.booking_requests br
where br.id in (select id from _qa_booking_requests);

delete from public.events e
where e.id in (select id from _qa_events);

delete from public.booking_plans bp
where bp.id in (select id from _qa_booking_plans);

delete from public.conversation_members cm
where cm.user_id in (select user_id from _qa_user_ids);

delete from public.conversations c
where c.id in (select conversation_id from _qa_only_conversations)
   or not exists (
     select 1
     from public.conversation_members cm
     where cm.conversation_id = c.id
   );

delete from public.dj_availability da
where da.user_id in (select user_id from _qa_user_ids);

delete from public.user_blocks ub
where ub.blocker_id in (select user_id from _qa_user_ids)
   or ub.blocked_id in (select user_id from _qa_user_ids);

commit;

-- ---------------------------------------------------------------------------
-- 2. QA storage cleanup (avatars preserved in profile-images)
-- event-covers path: {owner_id}/{event_id}/…
-- dm-attachments path: {conversation_id}/{user_id}/…
-- Supabase blocks direct storage.objects DELETE unless allow_delete_query is
-- set for the session — set it as a local (transaction-scoped) setting so it
-- covers both deletes below without weakening delete protection elsewhere.
-- ---------------------------------------------------------------------------

begin;

select set_config('storage.allow_delete_query', 'true', true);

delete from storage.objects so
where so.bucket_id = 'event-covers'
  and (
    (storage.foldername(so.name))[1] in (select user_id from _qa_user_ids)
    or (storage.foldername(so.name))[2] in (select id::text from _qa_events)
  );

delete from storage.objects so
where so.bucket_id = 'dm-attachments'
  and (
    (storage.foldername(so.name))[2] in (select user_id from _qa_user_ids)
    or (storage.foldername(so.name))[1] in (
      select conversation_id::text from _qa_only_conversations
    )
  );

commit;

-- ---------------------------------------------------------------------------
-- 3. Clear stale profile text on QA accounts only
-- ---------------------------------------------------------------------------

update public.users u
set
  dj_past_gigs = '',
  promoter_venues_used = '',
  promoter_upcoming_events = '',
  promoter_past_events = '',
  dj_availability = '',
  deleted_at = null
where u.user_id in (select user_id from _qa_user_ids);

-- ---------------------------------------------------------------------------
-- 4. Upsert / normalise QA profiles (accounts, usernames, roles preserved)
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
where u.user_id in (select user_id from _qa_user_ids)
  and u.display_name = s.display_name;

-- ---------------------------------------------------------------------------
-- 5. Verification
-- ---------------------------------------------------------------------------

select '--- QA chats/messages remaining (expect 0) ---' as section;

select 'qa_messages' as scope, count(*) as row_count
from public.messages m
where m.id in (select id from _qa_messages)
union all
select 'qa_message_reactions', count(*)
from public.message_reactions mr
where mr.message_id in (select id from _qa_messages)
   or mr.user_id in (select user_id from _qa_user_ids)
union all
select 'qa_message_attachments', count(*)
from public.message_attachments ma
where ma.message_id in (select id from _qa_messages)
   or ma.uploader_id in (select user_id from _qa_user_ids)
   or ma.conversation_id in (select conversation_id from _qa_only_conversations)
union all
select 'qa_message_reads', count(*)
from public.message_reads mr
where mr.user_id in (select user_id from _qa_user_ids)
union all
select 'qa_only_conversations', count(*)
from public.conversations c
where c.id in (select conversation_id from _qa_only_conversations)
order by scope;

select '--- QA bookings remaining (expect 0) ---' as section;

select 'qa_booking_requests' as scope, count(*) as row_count
from public.booking_requests br
where br.id in (select id from _qa_booking_requests)
union all
select 'qa_booking_request_history_hides', count(*)
from public.booking_request_history_hides h
where h.user_id in (select user_id from _qa_user_ids)
   or h.booking_request_id in (select id from _qa_booking_requests)
order by scope;

select '--- QA events/plans remaining (expect 0) ---' as section;

select 'qa_events' as scope, count(*) as row_count
from public.events e
where e.owner_id in (select user_id from _qa_user_ids)
union all
select 'qa_booking_plans', count(*)
from public.booking_plans bp
where bp.owner_id in (select user_id from _qa_user_ids)
union all
select 'qa_run_sheet_rows', count(*)
from public.event_run_sheet_rows r
where r.event_id in (select id from _qa_events)
union all
select 'qa_run_sheet_columns', count(*)
from public.event_run_sheet_columns c
where c.event_id in (select id from _qa_events)
union all
select 'qa_notifications', count(*)
from public.notifications n
where n.user_id in (select user_id from _qa_user_ids)
union all
select 'qa_dj_availability', count(*)
from public.dj_availability da
where da.user_id in (select user_id from _qa_user_ids)
union all
select 'qa_user_blocks', count(*)
from public.user_blocks ub
where ub.blocker_id in (select user_id from _qa_user_ids)
   or ub.blocked_id in (select user_id from _qa_user_ids)
union all
select 'qa_user_reports', count(*)
from public.user_reports ur
where ur.reporter_id in (select user_id from _qa_user_ids)
   or ur.reported_user_id in (select user_id from _qa_user_ids)
   or ur.conversation_id in (select conversation_id from _qa_only_conversations)
   or ur.message_id in (select id from _qa_messages)
order by scope;

select '--- QA accounts still present (profiles preserved) ---' as section;

select
  u.user_id,
  u.display_name,
  u.username,
  u.role,
  u.onboarding_complete,
  au.email as auth_email
from public.users u
left join auth.users au on au.id::text = u.user_id
where u.user_id in (select user_id from _qa_user_ids)
order by u.display_name;

select '--- non-QA data preserved (was not targeted) ---' as section;

select 'non_qa_events' as scope, count(*) as row_count
from public.events e
where e.owner_id not in (select user_id from _qa_user_ids)
union all
select 'non_qa_booking_plans', count(*)
from public.booking_plans bp
where bp.owner_id not in (select user_id from _qa_user_ids)
union all
select 'non_qa_booking_requests', count(*)
from public.booking_requests br
where br.id not in (select id from _qa_booking_requests)
union all
select 'non_qa_messages', count(*)
from public.messages m
where m.id not in (select id from _qa_messages)
union all
select 'non_qa_notifications', count(*)
from public.notifications n
where n.user_id not in (select user_id from _qa_user_ids)
order by scope;
