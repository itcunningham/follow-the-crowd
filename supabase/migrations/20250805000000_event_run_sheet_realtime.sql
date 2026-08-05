-- Enable Supabase Realtime for event_run_sheet (DJ view auto-updates).
-- Idempotent: safe to re-run in Supabase SQL Editor.

alter table public.event_run_sheet replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end
$$;

alter publication supabase_realtime add table public.event_run_sheet;
