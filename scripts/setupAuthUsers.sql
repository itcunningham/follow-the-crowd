-- Optional: run after enabling Supabase Auth email/password.
-- Existing broad dev RLS on public.users is enough for now.
-- New auth users get a public.users row from the app on signup (user_id = auth.users.id).

-- Ensure auth users can be linked by text user_id (already expected by the app):
-- alter table public.users add column if not exists user_id text;
-- create unique index if not exists users_user_id_key on public.users (user_id);

-- In Supabase Dashboard → Authentication → Providers:
-- 1. Enable Email provider
-- 2. For local dev, consider disabling "Confirm email" so signup goes straight to /onboarding

-- Demo-user rows are left untouched. Real users use their auth UUID as user_id.
