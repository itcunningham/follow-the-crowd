create or replace function public.can_view_event_run_sheet(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_event_run_sheet_owner(p_event_id)
    or public.is_event_crew_participant(p_event_id, public.auth_user_id())
    or exists (
      select 1
      from public.booking_requests br
      where br.event_id = p_event_id
        and br.recipient_id = public.auth_user_id()
        and br.status in ('pending', 'accepted')
    );
$$;
