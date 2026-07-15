# Supabase SQL

Database changes are versioned in **`supabase/migrations/`**. See **`supabase/README.md`** for deploy steps.

Isaac applies migrations by pasting the migration file once in the **Supabase SQL Editor** (this repo is not configured for Supabase CLI).

Legacy one-off scripts remain in `scripts/` for bootstrapping and fixes. New feature schema should be added as timestamped migrations, not duplicate `scripts/setup*.sql` files.

## When something breaks

| Error / feature | Where to look |
|-----------------|---------------|
| Events table missing | `scripts/setupEvents.sql` (legacy bootstrap) |
| Booking requests | `scripts/setupBookingRequests.sql` |
| Accepted booking cancellation | `scripts/setupAcceptedBookingCancellation.sql` |
| Event cover image column | `scripts/setupEventCoverImage.sql` |
| Event covers storage | `scripts/setupEventCoversStorage.sql` |
| Event fallback colour column | `scripts/setupEventFallbackColour.sql` |
| Expand colour keys (orange, pink) | `scripts/updateEventFallbackColourOptions.sql` |
| Event group chat | `scripts/setupEventCrewChat.sql` |
| Message reads / unread | `scripts/setupMessageReads.sql` |
| Duplicate booking protection | `scripts/fixEventBookingDuplicateProtection.sql` |
| Production RLS | `scripts/setupProductionRls.sql` |
| **Crew-chat auto-start auth** | `supabase/migrations/20250715180000_harden_crew_chat_auto_start_auth.sql` |
| **Security audit (production gate)** | `scripts/supabaseSecurityAuditChecklist.sql` |
| **Remove from history (Events)** | `supabase/migrations/20250710120000_event_history_hide.sql` |
| **Remove from history (Gigs / planner sent bookings)** | `supabase/migrations/20250710130000_booking_request_history_hides.sql` |
| Planner archive to Archived tab (legacy) | `scripts/setupBookingRequestArchiving.sql` — still required for `archived_at` + sender archive/unarchive |

## Deploy order (features with migrations)

1. Merge migration to `main`
2. Paste and run the migration in Supabase SQL Editor
3. Deploy the Next.js app

## Rough setup order (fresh project)

1. `setupAuthUsers.sql` / `setupUserProfiles.sql` / onboarding scripts as needed
2. `setupEvents.sql`
3. `setupBookingRequests.sql`
4. `setupProductionRls.sql`
5. Feature scripts as you enable features (DM, notifications, group chat, covers, fallback colour, etc.)
6. `supabase/migrations/*.sql` in timestamp order as features ship

## Legacy booking archive scripts

| Script | Status |
|--------|--------|
| `scripts/setupBookingRequestArchiving.sql` | **Still required** for planner sender archive/unarchive (`archived_at`, Archived tab) |
| `scripts/fixRecipientBookingArchive.sql` | **Legacy / superseded** for Remove from history — do not run for new deploys; migration `20250710130000` restores sender-only `archive_booking_request` and adds per-user hides |

## Production security verification (pre-beta gate)

**Do not mark passed until run against production Supabase.**

1. Run `scripts/supabaseSecurityAuditChecklist.sql` — all rows must pass (check #16: `ensure_event_crew_chat_auto_started` requires `auth_user_id()` + `is_event_crew_participant`; authenticated-only execute).
2. Confirm hardened RLS and crew-chat policies present; no legacy `using (true)` bootstrap policies on core tables.
3. Review Supabase Auth: email confirmation, password policy, rate limits.
4. Restrict Google Maps API key to approved production/preview domains.
5. Private beta: controlled invitations or allowlist — not unrestricted public signup.

## AI event generation (disabled for private beta)

- **Client:** `NEXT_PUBLIC_FTC_AI_EVENT_GENERATION_ENABLED=true` shows marketing AI UI.
- **Server:** `FTC_AI_EVENT_GENERATION_ENABLED=true` enables `/api/generate-event` (otherwise 404 `"Not available."`).
- **`OPENAI_API_KEY`:** server-only; missing key returns 404 (does not reveal key presence).
- **Re-enable after beta review:** set both flags to `true` in Vercel and redeploy. Manual Events and Event Plans unchanged.

## After running SQL

- Cursor app may need `notify pgrst, 'reload schema';` (included in migrations/scripts)
- Re-test the feature in the app

## When Isaac asks for SQL

For versioned changes, paste the entire file from `supabase/migrations/`. For legacy bootstrap, paste the entire file from `scripts/` — raw text only.
