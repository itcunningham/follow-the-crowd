-- Seed demo profiles for Discover testing.
-- Run after setupUsersOnboarding.sql and setupUserProfiles.sql

insert into public.users (
  user_id,
  role,
  onboarding_complete,
  display_name,
  bio,
  genre,
  location,
  instagram_url,
  soundcloud_url
)
values
  (
    'breaker-breaker',
    'dj',
    true,
    'Breaker Breaker',
    'Melbourne techno selector focused on peak-time warehouse energy.',
    'techno',
    'Melbourne',
    'https://instagram.com/breakerbreaker',
    'https://soundcloud.com/breakerbreaker'
  ),
  (
    'synergy-promoter',
    'promoter',
    true,
    'Synergy Promoter',
    'Underground event planner connecting DJs with the right rooms.',
    'underground events',
    'Melbourne',
    'https://instagram.com/synergypromoter',
    null
  ),
  (
    'warehouse-crew',
    'promoter',
    true,
    'Warehouse Crew',
    'Late-night rave promoters building raw warehouse experiences.',
    'warehouse raves',
    'Melbourne',
    null,
    null
  ),
  (
    'house-dj',
    'dj',
    true,
    'House DJ',
    'House and disco grooves for clubs, bars, and after-hours sets.',
    'house',
    'Melbourne',
    null,
    'https://soundcloud.com/housedj'
  )
on conflict (user_id) do update set
  role = excluded.role,
  onboarding_complete = excluded.onboarding_complete,
  display_name = excluded.display_name,
  bio = excluded.bio,
  genre = excluded.genre,
  location = excluded.location,
  instagram_url = excluded.instagram_url,
  soundcloud_url = excluded.soundcloud_url;
