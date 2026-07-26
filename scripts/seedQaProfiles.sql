-- Seed / normalise permanent FTC QA profiles (no auth user creation).
--
-- Run AFTER auth accounts exist (sign up via the app — do not insert into auth.users).
-- Safe to re-run. Idempotent upsert by auth email + display name.
--
-- For a full wipe + seed use scripts/resetQaEnvironment.sql instead.
-- Before first run: fill emails in _qa_email_map from .env.qa.local.

create temp table if not exists _qa_email_map (
  display_name text primary key,
  email text not null default ''
);

truncate _qa_email_map;

insert into _qa_email_map (display_name, email) values
  ('FTC QA Planner', ''),  -- FTC_QA_PLANNER_EMAIL
  ('FTC QA DJ', ''),       -- FTC_QA_DJ_EMAIL
  ('FTC QA DJ 1', ''),     -- optional: ftc.qa.dj1@…
  ('FTC QA DJ 2', ''),     -- optional: ftc.qa.dj2@…
  ('FTC QA DJ 3', ''),     -- optional: ftc.qa.dj3@…
  ('FTC QA Both', '');     -- FTC_QA_BOTH_EMAIL

with qa_seed as (
  select *
  from (
    values
      ('FTC QA Planner'::text, 'promoter'::text, 'ftcqa_planner'::text, 'Coached beta planner account for Follow The Crowd QA.'::text, null::text, 'Melbourne'::text, null::text, 'FTC QA Events'::text, 'Underground events and curated DJ bookings for beta testing.'::text),
      ('FTC QA DJ'::text, 'dj'::text, 'ftcqa_dj'::text, 'Primary E2E DJ account — house and disco sets.'::text, 'house'::text, 'Melbourne'::text, 'FTC QA DJ'::text, null::text, null::text),
      ('FTC QA DJ 1'::text, 'dj'::text, 'ftcqa_dj1'::text, 'Techno and peak-time warehouse energy — QA DJ 1.'::text, 'techno'::text, 'Melbourne'::text, 'QA DJ One'::text, null::text, null::text),
      ('FTC QA DJ 2'::text, 'dj'::text, 'ftcqa_dj2'::text, 'House, disco, and club grooves — QA DJ 2.'::text, 'house'::text, 'Melbourne'::text, 'QA DJ Two'::text, null::text, null::text),
      ('FTC QA DJ 3'::text, 'dj'::text, 'ftcqa_dj3'::text, 'Drum & bass and breakbeat selections — QA DJ 3.'::text, 'drum and bass'::text, 'Melbourne'::text, 'QA DJ Three'::text, null::text, null::text),
      ('FTC QA Both'::text, 'both'::text, 'ftcqa_both'::text, 'Dual-role QA account — plans events and plays DJ sets.'::text, 'eclectic'::text, 'Melbourne'::text, 'FTC QA Both'::text, 'FTC QA Dual'::text, 'Planner and DJ workflows for beta parity testing.'::text)
  ) as v(display_name, role, username, bio, genre, location, artist_name, promoter_brand_name, promoter_brand_description)
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
  join _qa_email_map m on lower(trim(au.email)) = lower(trim(m.email))
  join qa_seed s on s.display_name = m.display_name
  where m.email <> ''
)
insert into public.users (
  user_id, role, onboarding_complete, display_name, username, bio, genre, location,
  artist_name, promoter_brand_name, promoter_brand_description
)
select
  user_id, role, true, display_name, username, bio, genre, location,
  artist_name, promoter_brand_name, promoter_brand_description
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
  deleted_at = null
from qa_seed s
where u.display_name = s.display_name;

select u.user_id, u.display_name, u.username, u.role, u.onboarding_complete, au.email as auth_email
from public.users u
left join auth.users au on au.id::text = u.user_id
where u.display_name in (
  'FTC QA Planner', 'FTC QA DJ', 'FTC QA DJ 1', 'FTC QA DJ 2', 'FTC QA DJ 3', 'FTC QA Both'
)
order by u.display_name;

select m.display_name as missing_qa_account, 'sign up in app, set email in _qa_email_map, re-run' as action
from _qa_email_map m
left join public.users u on u.display_name = m.display_name
where u.user_id is null
order by m.display_name;
