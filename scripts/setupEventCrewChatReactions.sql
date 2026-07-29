-- Follow The Crowd — event crew group chat emoji reactions
-- Extends message_reactions RLS so crew chat messages (event_id) can be reacted to.
-- Run in Supabase SQL Editor after setupDmAttachmentsAndReactions.sql and setupEventCrewChat.sql.
-- Idempotent: safe to re-run.

drop policy if exists "message_reactions_select_member" on public.message_reactions;
drop policy if exists "message_reactions_insert_own" on public.message_reactions;

create policy "message_reactions_select_member"
  on public.message_reactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_reactions.message_id
        and (
          (
            m.conversation_id is not null
            and public.is_conversation_member(m.conversation_id)
          )
          or (
            m.event_id is not null
            and public.is_event_crew_member_for_message(m.event_id::text)
          )
        )
    )
  );

create policy "message_reactions_insert_own"
  on public.message_reactions
  for insert
  to authenticated
  with check (
    user_id = public.auth_user_id()
    and exists (
      select 1
      from public.messages m
      where m.id = message_reactions.message_id
        and (
          (
            m.conversation_id is not null
            and public.is_conversation_member(m.conversation_id)
          )
          or (
            m.event_id is not null
            and public.is_event_crew_member_for_message(m.event_id::text)
          )
        )
    )
  );
