-- Follow The Crowd — production Row Level Security
-- Run this entire script once in the Supabase SQL Editor after Auth is enabled.
-- Idempotent: safe to re-run. Does not delete data (including demo-user rows).
--
-- Prerequisites:
--   - Supabase Auth email/password enabled
--   - Existing tables from setupUsersOnboarding.sql, setupDmRls.sql,
--     setupNotifications.sql, setupBookingPlans.sql, setupBookingRequests.sql,
--     setupProfileImagesStorage.sql
--
-- Client updates required (already in repo):
--   - lib/startDm.ts calls public.start_dm()
--   - lib/notifications.ts createNotification() calls public.create_notification()

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.auth_user_id()
returns text
language sql
stable
set search_path = public
as $$
  select auth.uid()::text;
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()::text
  );
$$;

create or replace function public.is_conversation_participant(
  p_conversation_id uuid,
  p_other_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm_self
    join public.conversation_members cm_other
      on cm_self.conversation_id = cm_other.conversation_id
    where cm_self.conversation_id = p_conversation_id
      and cm_self.user_id = auth.uid()::text
      and cm_other.user_id = p_other_user_id
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
revoke all on function public.is_conversation_participant(uuid, text) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Secure RPC: start_dm
-- Creates or returns a 1:1 conversation for the authenticated user.
-- ---------------------------------------------------------------------------

create or replace function public.start_dm(p_target_user_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id text := public.auth_user_id();
  v_conversation_id uuid;
begin
  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null or btrim(p_target_user_id) = '' then
    raise exception 'Invalid target user';
  end if;

  if p_target_user_id = v_current_user_id then
    raise exception 'Cannot start a DM with yourself';
  end if;

  select cm_self.conversation_id
  into v_conversation_id
  from public.conversation_members cm_self
  join public.conversation_members cm_other
    on cm_self.conversation_id = cm_other.conversation_id
  where cm_self.user_id = v_current_user_id
    and cm_other.user_id = p_target_user_id
  order by cm_self.conversation_id
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations default values
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_current_user_id),
    (v_conversation_id, p_target_user_id);

  return v_conversation_id;
end;
$$;

revoke all on function public.start_dm(text) from public;
grant execute on function public.start_dm(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Secure RPC: create_notification
-- Allows cross-user notification delivery with relationship checks.
-- Direct client INSERT into notifications is blocked by RLS/grants.
-- ---------------------------------------------------------------------------

create or replace function public.create_notification(
  p_user_id text,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id text := public.auth_user_id();
  v_notification_id uuid;
  v_conversation_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'Invalid notification recipient';
  end if;

  if p_user_id = v_sender_id then
    raise exception 'Cannot create notification for yourself';
  end if;

  if p_type not in ('message', 'booking_request', 'booking_update') then
    raise exception 'Invalid notification type';
  end if;

  if p_type = 'message' then
    if p_link is null or p_link !~ '^/dm/[0-9a-fA-F-]{36}$' then
      raise exception 'Invalid message notification link';
    end if;

    v_conversation_id := substring(p_link from '^/dm/([0-9a-fA-F-]{36})$')::uuid;

    if not public.is_conversation_participant(v_conversation_id, p_user_id) then
      raise exception 'Not allowed to notify this user for this conversation';
    end if;
  elsif p_type = 'booking_request' then
    if not exists (
      select 1
      from public.booking_requests br
      where br.sender_id = v_sender_id
        and br.recipient_id = p_user_id
        and br.created_at > now() - interval '10 minutes'
    ) then
      raise exception 'Not allowed to create booking_request notification';
    end if;
  elsif p_type = 'booking_update' then
    if not exists (
      select 1
      from public.booking_requests br
      where br.recipient_id = v_sender_id
        and br.sender_id = p_user_id
        and br.status in ('accepted', 'declined')
    ) then
      raise exception 'Not allowed to create booking_update notification';
    end if;
  end if;

  insert into public.notifications (user_id, type, title, body, link, read)
  values (p_user_id, p_type, p_title, p_body, p_link, false)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification(text, text, text, text, text) from public;
grant execute on function public.create_notification(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants: authenticated only on app tables (revoke broad anon access)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

revoke all on table public.users from anon;
revoke all on table public.booking_plans from anon;
revoke all on table public.booking_requests from anon;
revoke all on table public.notifications from anon;
revoke all on table public.conversations from anon;
revoke all on table public.conversation_members from anon;
revoke all on table public.messages from anon;

grant select, insert, update on table public.users to authenticated;
grant select, insert, update, delete on table public.booking_plans to authenticated;
grant select, insert, update on table public.booking_requests to authenticated;
grant select, update on table public.notifications to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select, insert, update on table public.messages to authenticated;

-- Notifications: inserts only via create_notification() RPC
revoke insert on table public.notifications from authenticated;

-- DM creation: inserts only via start_dm() RPC
revoke insert on table public.conversations from authenticated;
revoke insert on table public.conversation_members from authenticated;

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;

drop policy if exists "Allow public read users" on public.users;
drop policy if exists "Allow public upsert users" on public.users;
drop policy if exists "Allow public update users" on public.users;
drop policy if exists "Allow anon select users" on public.users;
drop policy if exists "Allow anon upsert users" on public.users;
drop policy if exists "Allow anon update users" on public.users;
drop policy if exists "users_select_authenticated" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;

create policy "users_select_authenticated"
  on public.users
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (user_id = public.auth_user_id());

create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (user_id = public.auth_user_id())
  with check (user_id = public.auth_user_id());

-- ---------------------------------------------------------------------------
-- public.booking_plans
-- ---------------------------------------------------------------------------

alter table public.booking_plans enable row level security;

drop policy if exists "Allow anon select booking_plans" on public.booking_plans;
drop policy if exists "Allow anon insert booking_plans" on public.booking_plans;
drop policy if exists "Allow anon update booking_plans" on public.booking_plans;
drop policy if exists "booking_plans_select_own" on public.booking_plans;
drop policy if exists "booking_plans_insert_own" on public.booking_plans;
drop policy if exists "booking_plans_update_own" on public.booking_plans;
drop policy if exists "booking_plans_delete_own" on public.booking_plans;

create policy "booking_plans_select_own"
  on public.booking_plans
  for select
  to authenticated
  using (owner_id = public.auth_user_id());

create policy "booking_plans_insert_own"
  on public.booking_plans
  for insert
  to authenticated
  with check (owner_id = public.auth_user_id());

create policy "booking_plans_update_own"
  on public.booking_plans
  for update
  to authenticated
  using (owner_id = public.auth_user_id())
  with check (owner_id = public.auth_user_id());

create policy "booking_plans_delete_own"
  on public.booking_plans
  for delete
  to authenticated
  using (owner_id = public.auth_user_id());

-- ---------------------------------------------------------------------------
-- public.booking_requests
-- ---------------------------------------------------------------------------

alter table public.booking_requests enable row level security;

drop policy if exists "Allow anon select booking_requests" on public.booking_requests;
drop policy if exists "Allow anon insert booking_requests" on public.booking_requests;
drop policy if exists "Allow anon update booking_requests" on public.booking_requests;
drop policy if exists "booking_requests_select_participant" on public.booking_requests;
drop policy if exists "booking_requests_insert_sender" on public.booking_requests;
drop policy if exists "booking_requests_update_recipient" on public.booking_requests;

create policy "booking_requests_select_participant"
  on public.booking_requests
  for select
  to authenticated
  using (
    sender_id = public.auth_user_id()
    or recipient_id = public.auth_user_id()
  );

create policy "booking_requests_insert_sender"
  on public.booking_requests
  for insert
  to authenticated
  with check (
    sender_id = public.auth_user_id()
    and recipient_id <> public.auth_user_id()
    and public.is_conversation_member(conversation_id)
  );

create policy "booking_requests_update_recipient"
  on public.booking_requests
  for update
  to authenticated
  using (recipient_id = public.auth_user_id())
  with check (
    recipient_id = public.auth_user_id()
    and status in ('accepted', 'declined')
  );

-- ---------------------------------------------------------------------------
-- public.notifications
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;

drop policy if exists "Allow anon select notifications" on public.notifications;
drop policy if exists "Allow anon insert notifications" on public.notifications;
drop policy if exists "Allow anon update notifications" on public.notifications;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = public.auth_user_id());

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = public.auth_user_id())
  with check (user_id = public.auth_user_id());

-- ---------------------------------------------------------------------------
-- DM tables: conversations, conversation_members, messages
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Allow anon select conversations" on public.conversations;
drop policy if exists "Allow anon insert conversations" on public.conversations;
drop policy if exists "Allow anon select conversation_members" on public.conversation_members;
drop policy if exists "Allow anon insert conversation_members" on public.conversation_members;
drop policy if exists "conversations_select_member" on public.conversations;
drop policy if exists "conversation_members_select_shared" on public.conversation_members;
drop policy if exists "messages_select_conversation_member" on public.messages;
drop policy if exists "messages_insert_conversation_sender" on public.messages;
drop policy if exists "messages_update_conversation_member" on public.messages;
drop policy if exists "messages_select_event_authenticated" on public.messages;
drop policy if exists "messages_insert_event_sender" on public.messages;

create policy "conversations_select_member"
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_member(id));

create policy "conversation_members_select_shared"
  on public.conversation_members
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "messages_select_conversation_member"
  on public.messages
  for select
  to authenticated
  using (
    conversation_id is not null
    and public.is_conversation_member(conversation_id)
  );

create policy "messages_insert_conversation_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    conversation_id is not null
    and user_id = public.auth_user_id()
    and public.is_conversation_member(conversation_id)
  );

create policy "messages_update_conversation_member"
  on public.messages
  for update
  to authenticated
  using (
    conversation_id is not null
    and public.is_conversation_member(conversation_id)
  )
  with check (
    conversation_id is not null
    and public.is_conversation_member(conversation_id)
  );

-- Event crew chat messages (separate from DMs; authenticated-only MVP)
create policy "messages_select_event_authenticated"
  on public.messages
  for select
  to authenticated
  using (event_id is not null);

create policy "messages_insert_event_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    event_id is not null
    and user_id = public.auth_user_id()
  );

-- ---------------------------------------------------------------------------
-- Storage: profile-images bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read profile images" on storage.objects;
drop policy if exists "Anon upload profile images" on storage.objects;
drop policy if exists "Anon update profile images" on storage.objects;
drop policy if exists "profile_images_public_read" on storage.objects;
drop policy if exists "profile_images_insert_own_folder" on storage.objects;
drop policy if exists "profile_images_update_own_folder" on storage.objects;
drop policy if exists "profile_images_delete_own_folder" on storage.objects;

create policy "profile_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-images');

create policy "profile_images_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = public.auth_user_id()
  );

create policy "profile_images_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.auth_user_id()
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.auth_user_id()
  );

create policy "profile_images_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = public.auth_user_id()
  );

notify pgrst, 'reload schema';
