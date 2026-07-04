-- Follow The Crowd — secure account deletion helpers
-- Run in Supabase SQL Editor after users, bookings, events, and messaging exist.
-- Idempotent: safe to re-run.
-- Auth user removal is handled server-side with the Supabase service role key.

-- ---------------------------------------------------------------------------
-- Profile soft-delete marker
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists deleted_at timestamptz;

create index if not exists users_deleted_at_idx
  on public.users (deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- Pre-flight blockers
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
  v_reasons text[] := array[]::text[];
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.booking_requests br
    where br.status = 'pending'
      and (
        br.sender_id = v_user_id
        or br.recipient_id = v_user_id
      )
  ) then
    v_reasons := array_append(
      v_reasons,
      'You have pending booking requests. Cancel or resolve them first.'
    );
  end if;

  if exists (
    select 1
    from public.booking_requests br
    join public.events e
      on e.id = br.event_id
    where br.status = 'accepted'
      and (
        br.sender_id = v_user_id
        or br.recipient_id = v_user_id
      )
      and e.status in ('draft', 'upcoming')
  ) then
    v_reasons := array_append(
      v_reasons,
      'You have accepted bookings on upcoming events. Cancel those events or bookings first.'
    );
  end if;

  if exists (
    select 1
    from public.events e
    where e.owner_id = v_user_id
      and e.status in ('draft', 'upcoming')
  ) then
    v_reasons := array_append(
      v_reasons,
      'You still own draft or upcoming events. Cancel or delete them first.'
    );
  end if;

  return jsonb_build_object(
    'blocked', coalesce(array_length(v_reasons, 1), 0) > 0,
    'reasons', to_jsonb(coalesce(v_reasons, array[]::text[]))
  );
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
  v_blockers jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_blockers := public.check_account_deletion_blockers();

  if coalesce((v_blockers->>'blocked')::boolean, false) then
    raise exception 'Account deletion blocked';
  end if;

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
end;
$$;

revoke all on function public.check_account_deletion_blockers() from public;
revoke all on function public.delete_account_data() from public;
grant execute on function public.check_account_deletion_blockers() to authenticated;
grant execute on function public.delete_account_data() to authenticated;

notify pgrst, 'reload schema';
