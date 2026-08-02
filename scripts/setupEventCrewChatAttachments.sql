-- Follow The Crowd — event crew group chat image attachments
-- Extends message_attachments (and the shared dm-attachments storage bucket)
-- so crew chat messages (event_id) can carry photos, the same way DM messages
-- (conversation_id) already do.
-- Run in Supabase SQL Editor after setupDmAttachmentsAndReactions.sql and
-- setupEventCrewChat.sql (this script depends on both: the table/bucket from
-- the first, and public.is_event_crew_member_for_message from the second).
-- Idempotent: safe to re-run.
--
-- Deliberately reuses the existing dm-attachments bucket and
-- message_attachments table rather than creating a second upload system —
-- same shape as setupEventCrewChatReactions.sql, which extended
-- message_reactions the same way for crew chat reactions.

-- ---------------------------------------------------------------------------
-- message_attachments: allow event_id alongside conversation_id
-- ---------------------------------------------------------------------------

alter table public.message_attachments
  alter column conversation_id drop not null;

alter table public.message_attachments
  add column if not exists event_id uuid;

-- Every existing row has conversation_id set and event_id null, so this holds
-- immediately; going forward it keeps a row from silently having both or
-- neither, which would otherwise fall through both RLS branches below as
-- "not a member of anything" instead of failing loudly at insert time.
alter table public.message_attachments
  drop constraint if exists message_attachments_scope_check;

alter table public.message_attachments
  add constraint message_attachments_scope_check
  check (
    (conversation_id is not null and event_id is null)
    or (conversation_id is null and event_id is not null)
  );

create index if not exists message_attachments_event_id_idx
  on public.message_attachments (event_id);

-- ---------------------------------------------------------------------------
-- RLS: message_attachments — OR in the event-crew branch
-- ---------------------------------------------------------------------------

drop policy if exists "message_attachments_select_member" on public.message_attachments;
drop policy if exists "message_attachments_insert_uploader" on public.message_attachments;

create policy "message_attachments_select_member"
  on public.message_attachments
  for select
  to authenticated
  using (
    (
      conversation_id is not null
      and public.is_conversation_member(conversation_id)
    )
    or (
      event_id is not null
      and public.is_event_crew_member_for_message(event_id::text)
    )
  );

create policy "message_attachments_insert_uploader"
  on public.message_attachments
  for insert
  to authenticated
  with check (
    uploader_id = public.auth_user_id()
    and (
      (
        conversation_id is not null
        and public.is_conversation_member(conversation_id)
        and exists (
          select 1
          from public.messages m
          where m.id = message_id
            and m.conversation_id = message_attachments.conversation_id
            and m.user_id = public.auth_user_id()
        )
      )
      or (
        event_id is not null
        and public.is_event_crew_member_for_message(event_id::text)
        and exists (
          select 1
          from public.messages m
          where m.id = message_id
            and m.event_id = message_attachments.event_id
            and m.user_id = public.auth_user_id()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: reuse the dm-attachments bucket for event-scoped uploads too.
-- Path format for crew chat uploads: {event_id}/{user_id}/{filename} — same
-- shape as the existing {conversation_id}/{user_id}/{filename} DM paths, just
-- keyed by event id instead, so the two can never collide (a conversation id
-- and an event id are both v4 UUIDs from disjoint tables).
-- ---------------------------------------------------------------------------

drop policy if exists "dm_attachments_insert_member" on storage.objects;

create policy "dm_attachments_insert_member"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and auth.uid() is not null
    and (storage.foldername(name))[2] = public.auth_user_id()
    and (
      public.is_conversation_member(((storage.foldername(name))[1])::uuid)
      or public.is_event_crew_member_for_message((storage.foldername(name))[1])
    )
  );

-- update/delete/read policies are already scoped to "uploaded by me" or
-- "bucket is public" and don't need to know whether a path segment is a
-- conversation or an event id, so they're untouched.

notify pgrst, 'reload schema';
