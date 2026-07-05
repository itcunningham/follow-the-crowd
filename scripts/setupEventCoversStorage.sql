-- Idempotent storage setup for event cover images.
-- Run in Supabase SQL Editor after setupEventCoverImage.sql and setupProductionRls.sql.
--
-- Object path format: {ownerId}/{eventId}/{timestamp}-{sanitizedFileName}

insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do update set public = true;

drop policy if exists "event_covers_public_read" on storage.objects;
drop policy if exists "event_covers_insert_own_folder" on storage.objects;
drop policy if exists "event_covers_update_own_folder" on storage.objects;
drop policy if exists "event_covers_delete_own_folder" on storage.objects;

create policy "event_covers_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'event-covers');

create policy "event_covers_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'event-covers'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = public.auth_user_id()
  );

create policy "event_covers_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = public.auth_user_id()
  )
  with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = public.auth_user_id()
  );

create policy "event_covers_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = public.auth_user_id()
  );

notify pgrst, 'reload schema';
