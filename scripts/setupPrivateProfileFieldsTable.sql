-- PHASE 1: Create user_private_data table with explicit permissions
-- Run in Supabase SQL Editor after users table exists.
-- Safely re-runnable: DROP POLICY IF EXISTS before CREATE POLICY.

-- Create table
CREATE TABLE IF NOT EXISTS public.user_private_data (
  user_id text PRIMARY KEY REFERENCES public.users(user_id),
  dj_booking_contact_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_private_data ENABLE ROW LEVEL SECURITY;

BEGIN;

-- Explicitly revoke access from all roles before granting to authenticated
REVOKE ALL ON public.user_private_data FROM public;
REVOKE ALL ON public.user_private_data FROM anon;
REVOKE ALL ON public.user_private_data FROM authenticated;

-- Drop existing policies before recreating (safe re-run)
DROP POLICY IF EXISTS "User can view own private data"
  ON public.user_private_data;

DROP POLICY IF EXISTS "User can insert own private data"
  ON public.user_private_data;

DROP POLICY IF EXISTS "User can update own private data"
  ON public.user_private_data;

-- RLS policies: all scoped to authenticated role with explicit TO clause
-- Owner-only read
CREATE POLICY "User can view own private data"
  ON public.user_private_data
  FOR SELECT
  TO authenticated
  USING (user_id = public.auth_user_id()::text);

-- Owner-only insert
CREATE POLICY "User can insert own private data"
  ON public.user_private_data
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.auth_user_id()::text);

-- Owner-only update
CREATE POLICY "User can update own private data"
  ON public.user_private_data
  FOR UPDATE
  TO authenticated
  USING (user_id = public.auth_user_id()::text)
  WITH CHECK (user_id = public.auth_user_id()::text);

-- No DELETE policy. Deletion is performed by the privileged delete_account_data() RPC.

-- Grant explicit table privileges to authenticated role
-- SELECT, INSERT, UPDATE only. No DELETE.
GRANT SELECT, INSERT, UPDATE ON public.user_private_data TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
