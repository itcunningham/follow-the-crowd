-- Follow The Crowd — Direct Message user and message reporting
-- Run in Supabase SQL Editor after messages/conversations exist.
-- Idempotent: safe to re-run.
-- Does not apply to event group chats.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null,
  reported_user_id text not null,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  report_type text not null,
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint user_reports_type_check check (report_type in ('user', 'message')),
  constraint user_reports_reason_check check (
    reason in ('spam', 'harassment', 'inappropriate_content', 'scam_fraud', 'other')
  ),
  constraint user_reports_status_check check (status in ('open', 'reviewed', 'dismissed')),
  constraint user_reports_no_self_report check (reporter_id <> reported_user_id),
  constraint user_reports_message_shape_check check (
    (
      report_type = 'user'
      and message_id is null
      and conversation_id is not null
    )
    or (
      report_type = 'message'
      and message_id is not null
      and conversation_id is not null
    )
  )
);

create index if not exists user_reports_reporter_id_idx
  on public.user_reports (reporter_id);

create index if not exists user_reports_reported_user_id_idx
  on public.user_reports (reported_user_id);

create index if not exists user_reports_message_id_idx
  on public.user_reports (message_id);

create unique index if not exists user_reports_reporter_message_unique
  on public.user_reports (reporter_id, message_id)
  where report_type = 'message' and message_id is not null;

create unique index if not exists user_reports_open_user_report_unique
  on public.user_reports (reporter_id, reported_user_id, conversation_id)
  where report_type = 'user' and status = 'open';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.user_reports enable row level security;

drop policy if exists "user_reports_select_own" on public.user_reports;
drop policy if exists "user_reports_insert_own" on public.user_reports;

create policy "user_reports_select_own"
  on public.user_reports
  for select
  to authenticated
  using (reporter_id = public.auth_user_id());

create policy "user_reports_insert_own"
  on public.user_reports
  for insert
  to authenticated
  with check (
    reporter_id = public.auth_user_id()
    and reporter_id <> reported_user_id
    and conversation_id is not null
    and public.is_conversation_member(conversation_id)
    and (
      (
        report_type = 'user'
        and message_id is null
        and public.is_conversation_participant(conversation_id, reported_user_id)
      )
      or (
        report_type = 'message'
        and message_id is not null
        and exists (
          select 1
          from public.messages m
          where m.id = message_id
            and m.conversation_id = user_reports.conversation_id
            and m.user_id = reported_user_id
        )
      )
    )
  );

grant select, insert on table public.user_reports to authenticated;

notify pgrst, 'reload schema';
