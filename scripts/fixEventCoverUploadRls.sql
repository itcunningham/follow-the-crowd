-- Fix event flyer upload failures after setupSecurityHardening.sql.
-- Run in Supabase SQL Editor when edit-save returns
-- "new row violates row-level security policy" and cover_image_url stays null.
-- Idempotent. Then run scripts/supabaseReloadPostgrest.sql if needed.

-- ---------------------------------------------------------------------------
-- Helpers: evaluate ownership without RLS visibility edge cases
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_event_cover_storage(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and coalesce((storage.foldername(p_object_name))[1], '') = public.auth_user_id()
    and exists (
      select 1
      from public.events e
      where e.id::text = coalesce((storage.foldername(p_object_name))[2], '')
        and e.owner_id = public.auth_user_id()
    );
$$;

revoke all on function public.can_manage_event_cover_storage(text) from public;
grant execute on function public.can_manage_event_cover_storage(text) to authenticated;

create or replace function public.event_booking_plan_update_allowed(
  p_event_id uuid,
  p_booking_plan_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_booking_plan_id is null
    or exists (
      select 1
      from public.booking_plans bp
      where bp.id = p_booking_plan_id
        and bp.owner_id = public.auth_user_id()
    )
    or exists (
      select 1
      from public.events e
      where e.id = p_event_id
        and e.owner_id = public.auth_user_id()
        and e.booking_plan_id is not distinct from p_booking_plan_id
    );
$$;

revoke all on function public.event_booking_plan_update_allowed(uuid, text) from public;
grant execute on function public.event_booking_plan_update_allowed(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- storage.objects: event-covers write policies
-- ---------------------------------------------------------------------------

drop policy if exists "event_covers_insert_own_folder" on storage.objects;
drop policy if exists "event_covers_update_own_folder" on storage.objects;
drop policy if exists "event_covers_delete_own_folder" on storage.objects;

create policy "event_covers_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-covers'
    and public.can_manage_event_cover_storage(name)
  );

create policy "event_covers_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and public.can_manage_event_cover_storage(name)
  )
  with check (
    bucket_id = 'event-covers'
    and public.can_manage_event_cover_storage(name)
  );

create policy "event_covers_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and public.can_manage_event_cover_storage(name)
  );

-- ---------------------------------------------------------------------------
-- public.events: allow owner updates when booking_plan row was deleted later
-- ---------------------------------------------------------------------------

drop policy if exists "events_update_owner" on public.events;

create policy "events_update_owner"
  on public.events
  for update
  to authenticated
  using (owner_id = public.auth_user_id())
  with check (
    owner_id = public.auth_user_id()
    and public.event_booking_plan_update_allowed(id, booking_plan_id)
  );

notify pgrst, 'reload schema';
