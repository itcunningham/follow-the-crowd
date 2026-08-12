-- ============================================================================
-- PUBLIC.PUSH_SUBSCRIPTIONS
-- ============================================================================
-- Web Push subscription storage for beta notifications.
-- One row per device/browser/user combination.
-- Users can have multiple active subscriptions (desktop, mobile, etc.).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  device_name text,
  is_active boolean not null default true
);

create index if not exists push_subscriptions_user_id_active_idx
  on public.push_subscriptions (user_id, is_active);

create index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint) where is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.push_subscriptions enable row level security;

-- Users can select only their own subscriptions
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

-- Users can insert their own subscriptions
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

-- Users can update/deactivate their own subscriptions
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own subscriptions
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================

revoke all on table public.push_subscriptions from anon;
revoke all on table public.push_subscriptions from authenticated;

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;
