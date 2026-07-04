-- Follow The Crowd — secure account deletion helpers
-- Run in Supabase SQL Editor after users, bookings, events, and messaging exist.
-- Idempotent: safe to re-run.
-- Auth user and storage removal are handled inside delete_account_data().

-- ---------------------------------------------------------------------------
-- Profile soft-delete marker
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists deleted_at timestamptz;

create index if not exists users_deleted_at_idx
  on public.users (deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- Pre-deletion warnings (informational only — deletion is not blocked)
-- ---------------------------------------------------------------------------

create or replace function public.check_account_deletion_blockers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
  v_warnings text[] := array[]::text[];
  v_pending_count integer := 0;
  v_accepted_count integer := 0;
  v_owned_event_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select count(*)::integer
  into v_pending_count
  from public.booking_requests br
  where br.status = 'pending'
    and (
      br.sender_id = v_user_id
      or br.recipient_id = v_user_id
    );

  if v_pending_count > 0 then
    v_warnings := array_append(
      v_warnings,
      format(
        '%s pending booking request%s will be cancelled automatically.',
        v_pending_count,
        case when v_pending_count = 1 then '' else 's' end
      )
    );
  end if;

  select count(*)::integer
  into v_accepted_count
  from public.booking_requests br
  join public.events e
    on e.id = br.event_id
  where br.status = 'accepted'
    and (
      br.sender_id = v_user_id
      or br.recipient_id = v_user_id
    )
    and e.status in ('draft', 'upcoming');

  if v_accepted_count > 0 then
    v_warnings := array_append(
      v_warnings,
      format(
        '%s accepted booking%s on upcoming events will be cancelled automatically.',
        v_accepted_count,
        case when v_accepted_count = 1 then '' else 's' end
      )
    );
  end if;

  select count(*)::integer
  into v_owned_event_count
  from public.events e
  where e.owner_id = v_user_id
    and e.status in ('draft', 'upcoming');

  if v_owned_event_count > 0 then
    v_warnings := array_append(
      v_warnings,
      format(
        '%s draft or upcoming event%s you own will be cancelled or removed automatically.',
        v_owned_event_count,
        case when v_owned_event_count = 1 then '' else 's' end
      )
    );
  end if;

  return jsonb_build_object(
    'blocked', false,
    'reasons', to_jsonb(coalesce(v_warnings, array[]::text[]))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel/remove bookings and events before anonymising the account
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_account_deletion_dependencies()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Soft-cancel owned draft/upcoming events that still have booking requests.
  update public.events
  set status = 'cancelled'
  where owner_id = v_user_id
    and status in ('draft', 'upcoming')
    and exists (
      select 1
      from public.booking_requests br
      where br.event_id = events.id
    );

  -- Cancel all active bookings on those now-cancelled owned events.
  update public.booking_requests br
  set status = 'cancelled'
  from public.events e
  where br.event_id = e.id
    and e.owner_id = v_user_id
    and e.status = 'cancelled'
    and br.status in ('pending', 'accepted');

  -- Remove owned draft/upcoming events with no booking history.
  delete from public.events
  where owner_id = v_user_id
    and status in ('draft', 'upcoming')
    and not exists (
      select 1
      from public.booking_requests br
      where br.event_id = events.id
    );

  -- Cancel remaining pending booking requests involving the user.
  update public.booking_requests
  set status = 'cancelled'
  where status = 'pending'
    and (
      sender_id = v_user_id
      or recipient_id = v_user_id
    );

  -- Cancel accepted bookings on other users' draft/upcoming events.
  update public.booking_requests br
  set status = 'cancelled'
  from public.events e
  where br.event_id = e.id
    and br.status = 'accepted'
    and (
      br.sender_id = v_user_id
      or br.recipient_id = v_user_id
    )
    and e.owner_id <> v_user_id
    and e.status in ('draft', 'upcoming');
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete/anonymize app data for the authenticated user
-- ---------------------------------------------------------------------------

create or replace function public.delete_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := public.auth_user_id();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.cleanup_account_deletion_dependencies();

  delete from storage.objects
  where bucket_id = 'profile-images'
    and name like v_user_id || '/%';

  delete from storage.objects
  where bucket_id = 'dm-attachments'
    and split_part(name, '/', 2) = v_user_id;

  delete from public.dj_availability
  where user_id = v_user_id;

  delete from public.message_reads
  where user_id = v_user_id;

  delete from public.message_reactions
  where user_id = v_user_id;

  delete from public.notifications
  where user_id = v_user_id;

  delete from public.user_blocks
  where blocker_id = v_user_id
     or blocked_id = v_user_id;

  delete from public.user_reports
  where reporter_id = v_user_id;

  delete from public.message_attachments
  where uploader_id = v_user_id;

  delete from public.booking_plans
  where owner_id = v_user_id;

  update public.users
  set
    display_name = 'Deleted User',
    bio = '',
    genre = '',
    location = '',
    instagram_url = '',
    soundcloud_url = '',
    avatar_url = '',
    dj_availability = '',
    dj_past_gigs = '',
    promoter_venues_used = '',
    promoter_upcoming_events = '',
    promoter_past_events = '',
    role = null,
    onboarding_complete = false,
    deleted_at = now()
  where user_id = v_user_id;

  if not found then
    insert into public.users (
      user_id,
      display_name,
      onboarding_complete,
      deleted_at
    )
    values (
      v_user_id,
      'Deleted User',
      false,
      now()
    )
    on conflict (user_id) do update
    set
      display_name = excluded.display_name,
      onboarding_complete = excluded.onboarding_complete,
      deleted_at = excluded.deleted_at;
  end if;

  delete from auth.users
  where id = v_user_id::uuid;
end;
$$;

revoke all on function public.check_account_deletion_blockers() from public;
revoke all on function public.cleanup_account_deletion_dependencies() from public;
revoke all on function public.delete_account_data() from public;
grant execute on function public.check_account_deletion_blockers() to authenticated;
grant execute on function public.delete_account_data() to authenticated;

notify pgrst, 'reload schema';
