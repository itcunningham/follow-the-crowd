-- Optional one-time repair for profiles broken before saveUserProfile was fixed.
-- Symptom: display_name is set, but role and/or onboarding_complete were nullified by upsert(defaultToNull=true).
-- Run in Supabase SQL Editor, inspect results, then repair known users manually.

select
  user_id,
  role,
  onboarding_complete,
  display_name
from public.users
where btrim(coalesce(display_name, '')) <> ''
  and (role is null or onboarding_complete is distinct from true)
order by display_name;

-- Example repair for a known DJ account (replace USER_ID and role as needed):
-- update public.users
-- set role = 'dj', onboarding_complete = true
-- where user_id = 'PASTE-AUTH-USER-UUID-HERE';
