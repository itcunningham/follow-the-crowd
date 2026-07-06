-- Security hardening migration for Follow The Crowd.
-- Run in Supabase SQL Editor after setupProductionRls.sql and feature setup scripts.
-- Idempotent. Also run scripts/supabaseReloadPostgrest.sql if PostgREST schema cache is stale.

-- ---------------------------------------------------------------------------
-- 1. Restrict message updates to own messages or booking-request participants
-- ---------------------------------------------------------------------------

drop policy if exists "messages_update_conversation_member" on public.messages;

create policy "messages_update_conversation_member"
  on public.messages
  for update
  to authenticated
  using (
    conversation_id is not null
    and public.is_conversation_member(conversation_id)
    and (
      user_id = public.auth_user_id()
      or (
        left(text, 16) = 'BOOKING REQUEST'
        and exists (
          select 1
          from public.booking_requests br
          where br.conversation_id = messages.conversation_id
            and (
              br.sender_id = public.auth_user_id()
              or br.recipient_id = public.auth_user_id()
            )
        )
      )
    )
  )
  with check (
    conversation_id is not null
    and public.is_conversation_member(conversation_id)
    and (
      user_id = public.auth_user_id()
      or (
        left(text, 16) = 'BOOKING REQUEST'
        and exists (
          select 1
          from public.booking_requests br
          where br.conversation_id = messages.conversation_id
            and (
              br.sender_id = public.auth_user_id()
              or br.recipient_id = public.auth_user_id()
            )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Event cover uploads must target an event owned by the caller
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
    and auth.uid() is not null
    and (storage.foldername(name))[1] = public.auth_user_id()
    and exists (
      select 1
      from public.events e
      where e.id::text = (storage.foldername(name))[2]
        and e.owner_id = public.auth_user_id()
    )
  );

create policy "event_covers_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = public.auth_user_id()
    and exists (
      select 1
      from public.events e
      where e.id::text = (storage.foldername(name))[2]
        and e.owner_id = public.auth_user_id()
    )
  )
  with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = public.auth_user_id()
    and exists (
      select 1
      from public.events e
      where e.id::text = (storage.foldername(name))[2]
        and e.owner_id = public.auth_user_id()
    )
  );

create policy "event_covers_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = public.auth_user_id()
    and exists (
      select 1
      from public.events e
      where e.id::text = (storage.foldername(name))[2]
        and e.owner_id = public.auth_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Internal helper RPCs should not be callable directly from clients
-- ---------------------------------------------------------------------------

revoke execute on function public.are_users_dm_blocked(text, text) from authenticated;
revoke execute on function public.is_event_crew_participant(uuid, text) from authenticated;

notify pgrst, 'reload schema';
