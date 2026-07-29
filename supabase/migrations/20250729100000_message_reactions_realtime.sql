-- Enable Supabase Realtime for message_reactions (DM + crew chat reaction subscriptions).
-- Idempotent: safe to re-run in Supabase SQL Editor.
--
-- Without this, postgres_changes on message_reactions never reach clients even when
-- RLS allows SELECT and client channels are subscribed.

alter table public.message_reactions replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Verification: both rows must return true.
select
  'message_reactions_in_publication' as check_name,
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reactions'
  ) as passed
union all
select
  'message_reactions_replica_identity_full',
  (
    select relreplident = 'f'
    from pg_class
    where oid = 'public.message_reactions'::regclass
  );
