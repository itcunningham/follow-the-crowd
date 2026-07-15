-- Remove legacy public INSERT policy on public.messages (bypasses hardened RLS).
-- Idempotent: safe to re-run in Supabase SQL Editor.

drop policy if exists "allow public insert messages" on public.messages;

-- Defense in depth: anon and PUBLIC must not have table-level INSERT on messages.
-- Explicit authenticated grant from setupProductionRls.sql is unchanged.
revoke insert on table public.messages from anon;
revoke insert on table public.messages from public;

notify pgrst, 'reload schema';
