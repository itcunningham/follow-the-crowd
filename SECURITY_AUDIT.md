# Follow The Crowd — Security Audit

**Date:** 2026-07-06  
**Scope:** Next.js app, Supabase auth/data/storage, API routes, SQL scripts in `scripts/`

---

## Summary

| Severity | Count | Notes |
|----------|------:|-------|
| Critical | 1 | Fixed in code |
| High | 2 | 1 fixed in code; 1 requires manual SQL |
| Medium | 5 | Documented; 2 addressed in SQL migration |
| Low | 4 | Documented |
| Passed | 8 | Areas verified OK |

No hardcoded secrets, service-role keys, or OpenAI keys were found in tracked source files. `.env.local` is gitignored.

---

## A. Secrets and environment variables

### Passed
- **`.gitignore`** ignores `.env*` and allows `.env.example` (added in this audit).
- **`lib/supabaseClient.ts`** uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **`OPENAI_API_KEY`** is server-only (no `NEXT_PUBLIC_` prefix).
- **No `SUPABASE_SERVICE_ROLE_KEY`** or `service_role` references anywhere in the repo.
- **Account deletion API** uses anon key + user JWT, not service role.

### Medium — Missing env documentation
- **Files:** (none previously) → **`.env.example`** added.
- **Why:** Reduces misconfiguration risk; documents which vars are public vs server-only.
- **Action:** Copy `.env.example` to `.env.local` locally. Set `OPENAI_API_KEY` in Vercel project env (server-only).

### Low — Public Google Maps key in browser
- **File:** `app/components/VenueMap.tsx` (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- **Why:** Expected for client maps; must be restricted by HTTP referrer in Google Cloud Console.
- **Action (manual):** Restrict key to your production domain in Google Cloud.

### Low — Debug page logs Supabase URL
- **File:** `app/test-supabase/page.tsx`
- **Why:** Logs project URL to browser console (not the anon key).
- **Action:** Remove or protect this route before production launch if still present.

---

## B. Supabase client usage

### Passed
- Single browser client: `lib/supabaseClient.ts` (anon key only).
- Server API routes create scoped clients with the caller’s Bearer token.
- No admin/service-role client in application code.

---

## C. Database access and RLS

### Tables in use
`users`, `booking_plans`, `booking_requests`, `notifications`, `events`, `conversations`, `conversation_members`, `messages`, `message_reads`, `message_attachments`, `message_reactions`, `dj_availability`, `user_blocks`, `user_reports`, `event_run_sheet_columns`, `event_run_sheet_rows`, plus storage buckets `profile-images`, `dm-attachments`, `event-covers`.

### Passed (when production scripts applied)
- **`scripts/setupProductionRls.sql`** revokes anon on core tables and scopes access to authenticated users with participant/owner checks.
- **Bookings:** select/insert/update limited to sender/recipient; mutations also enforced by SECURITY DEFINER RPCs.
- **DMs:** conversation membership required; blocks enforced on insert (`setupUserBlocks.sql`).
- **Notifications:** direct client insert revoked; inserts via `create_notification()` RPC only.
- **Events:** owner CRUD; select also for booking recipients on linked events.
- **Event crew chat:** tightened by `setupEventCrewChat.sql` (must run after production RLS).

### Critical — Dev RLS scripts must not be used in production
- **Files:** `setupBookingRequests.sql`, `setupBookingPlans.sql`, `setupNotifications.sql`, `setupDmRls.sql`, `setupUsersOnboarding.sql`
- **Why:** These grant anon/authenticated wide-open `using (true)` policies.
- **Action (manual):** Confirm production Supabase has run `setupProductionRls.sql` and subsequent feature scripts. Run **`scripts/supabaseSecurityAudit.sql`** and verify no anon grants on core tables and `rls_enabled = true`.

### High — Event crew chat policies depend on migration order
- **File:** `scripts/setupProductionRls.sql` (MVP event message policies) → superseded by `scripts/setupEventCrewChat.sql`
- **Why:** Without crew chat script, any authenticated user may read event-linked messages.
- **Action (manual):** Confirm `setupEventCrewChat.sql` has been applied in production.

### Medium — Public storage buckets
- **Files:** `setupEventCoversStorage.sql`, `setupDmAttachmentsAndReactions.sql`, `setupProfileImagesStorage.sql`
- **Why:** Public read is intentional for flyers/profile/DM URLs; anyone with the URL can fetch objects.
- **Action:** Accept for MVP, or move to private buckets + signed URLs later.

---

## D. RPC functions and server-side permissions

### Passed
All app-called RPCs verify `auth_user_id()` and row ownership:
`start_dm`, `create_notification`, `cancel_booking_request`, `archive_booking_request`, `unarchive_booking_request`, `hide_declined_booking_from_lineup`, `propose_booking_rate`, `accept_proposed_booking_rate`, `decline_proposed_booking_rate`, `delete_empty_event`, `cancel_event`, `get_event_crew_participant_ids`, `check_account_deletion_blockers`, `delete_account_data`.

Booking accept/decline also enforced by RLS on `booking_requests` (`setupBookingCancellation.sql`).

### Medium — Callable internal helpers
- **Functions:** `are_users_dm_blocked(text, text)`, `is_event_crew_participant(uuid, text)`
- **Why:** Granted to `authenticated`; any signed-in user could probe block/crew status for arbitrary user IDs.
- **Action (manual):** Run **`scripts/setupSecurityHardening.sql`** (revokes direct client execute).

---

## E. Storage

### Passed
- Upload paths scoped to `{auth_user_id}/...` for profile images, DM attachments, and event covers.
- Event DB rows updated only when `events.owner_id = auth user` (`lib/events.ts`).

### Medium — Event cover upload path not tied to event ownership (fixed in SQL)
- **File:** `scripts/setupEventCoversStorage.sql` (original policies)
- **Why:** User could upload into `{theirUid}/{任意-eventId}/` even without owning that event.
- **Action (manual):** Run **`scripts/setupSecurityHardening.sql`**.

---

## F. Abuse and cost protection

### Critical — Unauthenticated OpenAI proxy (fixed)
- **File:** `app/api/generate-event/route.ts`
- **Why:** Anyone could POST to trigger OpenAI usage and cost.
- **Changed:** Requires Supabase Bearer token (`lib/api/authenticateSupabaseRequest.ts`). Client updated in `lib/client/generate-event-plan.ts`. Input fields truncated to 200 chars (`lib/api/validateEventBrief.ts`). Generic error when `OPENAI_API_KEY` missing.

### High — Any conversation member could update any message (fixed in SQL)
- **File:** `scripts/setupProductionRls.sql` → policy `messages_update_conversation_member`
- **Why:** Member could edit another member’s non-booking chat text.
- **Changed:** **`scripts/setupSecurityHardening.sql`** limits updates to own messages or booking-request messages where caller is booking sender/recipient (preserves accept/decline/cancel message sync).

### Medium — No rate limiting on API routes
- **Routes:** `/api/generate-event`, `/api/account/delete`
- **Why:** Authenticated abuse could still spam AI generation or deletion attempts.
- **Action (manual / next step):** Add Vercel edge rate limits or Upstash Redis limits per user/IP (recommended: 10 AI requests/user/hour).

### Low — Client-only upload validation
- **Files:** `lib/events/eventCoverImage.ts`, `lib/dmAttachments.ts`
- **Why:** MIME/size checks are not enforced at storage layer.
- **Action (manual):** Set bucket `allowed_mime_types` and file size limits in Supabase Storage settings.

---

## Code changes in this audit

| File | Change |
|------|--------|
| `lib/api/authenticateSupabaseRequest.ts` | Shared Bearer auth for API routes |
| `lib/api/validateEventBrief.ts` | Truncate/sanitize AI brief input |
| `app/api/generate-event/route.ts` | Require auth; generic errors |
| `lib/client/generate-event-plan.ts` | Send Authorization header |
| `app/api/account/delete/route.ts` | Use shared auth helper |
| `.env.example` | Document required env vars |
| `.gitignore` | Allow `.env.example` |
| `scripts/supabaseSecurityAudit.sql` | Read-only RLS/RPC audit queries |
| `scripts/setupSecurityHardening.sql` | Message update, event cover, helper RPC hardening |

---

## Manual actions checklist (Supabase / Vercel / Google)

1. Run **`scripts/supabaseSecurityAudit.sql`** in Supabase SQL Editor; review output.
2. Run **`scripts/setupSecurityHardening.sql`** in Supabase SQL Editor.
3. Confirm production has applied: `setupProductionRls.sql`, `setupEventCrewChat.sql`, `setupUserBlocks.sql`, booking/event feature scripts.
4. Set **`OPENAI_API_KEY`** in Vercel (Production + Preview), never as `NEXT_PUBLIC_*`.
5. Restrict **Google Maps API key** by HTTP referrer in Google Cloud Console.
6. (Recommended) Add rate limiting on `/api/generate-event` in Vercel or via Upstash.

---

## Booking creation `rate_mode` (related prior fix)

Commit `23ea25d` ensures `rate_mode` is sent on insert. If inserts still return `fixed` after selecting Open to offers, run **`scripts/supabaseReloadPostgrest.sql`**.
