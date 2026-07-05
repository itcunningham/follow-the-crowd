-- Idempotent migration: optional fallback colour key for event artwork tiles.
-- Run in Supabase SQL Editor after setupEvents.sql.

alter table public.events
  add column if not exists fallback_colour text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_fallback_colour_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_fallback_colour_check
      check (
        fallback_colour is null
        or fallback_colour in (
          'blue',
          'violet',
          'teal',
          'green',
          'amber',
          'red',
          'slate'
        )
      );
  end if;
end $$;

notify pgrst, 'reload schema';
