-- Idempotent migration: expand allowed event fallback_colour keys.
-- Run in Supabase SQL Editor after setupEventFallbackColour.sql.

alter table public.events
  drop constraint if exists events_fallback_colour_check;

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
      'orange',
      'red',
      'pink',
      'slate'
    )
  );

notify pgrst, 'reload schema';
