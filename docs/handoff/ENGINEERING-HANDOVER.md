# FTC Engineering Handover

**Prepared:** 2026-08-18, for handover to a professional software engineer.
**Phase:** Coached Private Beta (GO recorded 2026-07-16 — see `docs/qa/PRIVATE-BETA-GO-LIVE.md`).

This document is the entry point. It does not replace the existing docs in
`docs/handoff/` and `docs/qa/` — it tells you what's current, what's stale,
and where to go next. Read this first, then follow the pointers.

---

## 1. Release state

| | Value |
|---|---|
| Local `main` commit | `426bd4a5` |
| `origin/main` commit | `426bd4a5` — **matches local, no drift** |
| Canonical Production host | `follow-the-crowd.vercel.app` (see `lib/debug/ftcDeployment.ts` for the canonical-vs-preview host check) |
| Production deployment status | **Not independently verified this round.** This working environment has no outbound network egress to Production and no Vercel API access — `WebFetch` to `follow-the-crowd.vercel.app` returns `EGRESS_BLOCKED` every time it's attempted. **The incoming engineer must confirm the Vercel dashboard shows `426bd4a5` (or later) deployed to Production before trusting anything below as live.** |
| Supabase project | Project ref `gidplxriruttihfirvii` (from `docs/handoff/SUPABASE.md`) — **this working environment has no live Supabase access either** (`.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` is a placeholder, `https://example.supabase.co`). All Supabase-related findings below are from reading migration files and code, not from a live connection. |

**No commit mismatch found between local and `origin/main`.** Whether that commit is what Production is actually serving cannot be confirmed from this environment — this exact class of gap (repo correct, Production silently stale) has already bitten this project once for the Supabase Edge Function (see §4 and §10).

---

## 2. Build / test state

Run 2026-08-18 against `426bd4a5`:

**`npm run build`** — **PASSES.** Compiles cleanly, all routes generate, no TypeScript errors.

**`npm run test:regressions`** — **FAILS**, but only on one specific, well-understood, pre-existing assertion:

```
AssertionError [ERR_ASSERTION]: authoritative zero must replace an empty session display
1 !== 0
  at testWorkspaceGigsPendingDisplayCountPreservesLastKnown (scripts/test-regressions.mts:5042:10)
```

- **Test name:** `testWorkspaceGigsPendingDisplayCountPreservesLastKnown`
- **Why believed unrelated:** this exact failure, at this exact assertion, has been present and unchanged across every round of work recorded in `docs/handoff/CURRENT-STATE.md` for the last several days — it predates and is orthogonal to every change made in that window (push notifications, event-save fix, DM/crew chat scroll behaviour). It has never been root-caused or fixed; every round has simply confirmed it's the same failure and moved on.
- **Does it affect beta:** **Not confirmed either way.** It has never been investigated to the point of knowing whether the underlying `testWorkspaceGigsPendingDisplayCountPreservesLastKnown` behaviour it's testing (a workspace "pending gigs" count staying stable) is actually broken in the product, or whether the test itself has a stale assertion (the ninth-round entry in `CURRENT-STATE.md`, 2026-08-16, found and fixed eight *other* long-standing false failures of exactly this shape — stale regexes, not real bugs — in this same test run, so a stale-assertion explanation here is plausible but **not verified**).
- **Practical consequence:** `npm run test:regressions` halts at this point every time, so **no test registered after it in `main()`'s call order has been exercised by a full run in a long time** — a real gap. Individual newer tests have been spot-verified in isolation (documented per-round in `CURRENT-STATE.md`), but the suite as a whole has not run end-to-end clean. **This is the single highest-value thing for the incoming engineer to fix**, not because the failure itself is dangerous, but because it's been silently hiding whether ~everything after it still passes.

**Do not claim "all green."** It is not. Build is green; the regression suite has one standing, uninvestigated failure.

---

## 3. Supabase / database state

*(Full migration inventory, table/RLS/RPC/trigger catalog, and manual-application status: see the dedicated audit appended as §3a below, produced by reading every file under `supabase/migrations/` plus cross-referencing `docs/handoff/CURRENT-STATE.md` and `docs/handoff/SUPABASE.md`.)*

**Headline facts, already known from the handoff history and worth stating up front:**

- Migrations under `supabase/migrations/` are **not auto-applied**. Every one requires a manual paste into the Supabase SQL Editor. Nothing in CI or the Vercel deploy pipeline applies them.
- As of the most recent dated entries in `CURRENT-STATE.md`, `active_chat_presence` (migration `20260818000000_active_chat_presence.sql`) and the `events.event_brand` column were both confirmed **applied** to Production after initially being found missing — but those confirmations are now several rounds old. **Re-verify, don't assume.**
- `docs/qa/RELEASE-CHECKLIST.md` item **REL-05a** ("rerun the security audit after any manually applied SQL") is recorded as **Not Started** as of the last checklist update, and multiple migrations have been manually applied since. **The security audit scripts (`scripts/supabaseSecurityAuditChecklist.sql` + `scripts/supabaseSecurityAuditChecklistSupplement.sql`, both read-only) should be rerun against Production before this goes further.** See `docs/handoff/SUPABASE.md`'s own words on why a past-passing audit is not a standing guarantee: Postgres permissive RLS policies are OR'd together, so a stale broad policy silently defeats a tighter one beside it, with no error and no log line.

### 3a. Migration inventory (chronological)

| Migration | Summary | Manual-application status (most recent claim in `CURRENT-STATE.md` wins — the doc's own reference table at ~line 1900 is proven stale in two places below, don't trust it over the dated narrative entries) |
|---|---|---|
| `20250101000000_baseline_phase2c.sql` | Retroactive full-schema baseline: all 12 core tables, RLS, grants, `auth_user_id()`/`is_conversation_member()`/`start_dm()`/`create_notification()` (5-arg). Documented as a fresh-DB bootstrap consolidation, not a Production delta. | Not a pending-paste item — Production's schema predates and already reflects this. |
| `20250710120000_event_history_hide.sql` | `events.history_hidden_at` + hide-from-history RPCs (cancelled events only, at this point). | Applied |
| `20250710130000_booking_request_history_hides.sql` | New `booking_request_history_hides` table + RPCs; re-creates `archive_booking_request` sender-only. | Applied |
| `20250710140000_booking_request_history_hides_grants.sql` | Grants-only follow-up to the above. | Applied (bundled with the above) |
| `20250715180000_harden_crew_chat_auto_start_auth.sql` | Requires caller be owner/accepted-crew before auto-starting a crew chat. | Applied — confirmed at beta GO, 2026-07-16 |
| `20250715213000_remove_legacy_public_message_insert.sql` | Drops a Production-only `TO public … WITH CHECK (true)` insert policy on `messages` that **existed live but was never in version control**; explicitly revokes `messages` INSERT from `anon`/`public` as defense-in-depth. | Applied — confirmed at beta GO |
| `20250720120000_event_history_hide_past.sql` | Extends history-hide to non-cancelled past events. | **Last known status: not yet applied as of 2026-07-20, no later confirmation found. Verify directly** (e.g. does `planner_event_can_hide_from_history` exist in Production). |
| `20250729100000_message_reactions_realtime.sql` | Adds `message_reactions` to the realtime publication (reaction events weren't reaching clients). | Applied — confirmed working 2026-07-30. `docs/handoff/SUPABASE.md`'s own quick-reference table still ⚠️-flags this as pending — **that flag is stale, ignore it.** |
| `20250730120000_reaction_notification_lifecycle.sql` | `notifications.reaction_id` + 6-arg `create_notification`, reaction-keyed dedupe. | Applied — explicitly confirmed |
| `20250805000000_event_run_sheet_realtime.sql` | Adds `event_run_sheet_rows` to the realtime publication. | Not explicitly confirmed either way, no red flag either |
| `20250805000001_allow_pending_djs_to_view_run_sheet.sql` | Widens run-sheet view access to `pending`-status DJs, not just accepted. | Not explicitly confirmed either way, no red flag either |
| `20260812000000_push_subscriptions.sql` | New `push_subscriptions` table for Web Push. | Applied — confirmed live end-to-end on real devices, 2026-08-14 |
| `20260816000000_notification_dedupe_includes_body.sql` | `create_notification` dedupe now also compares `body` (fixed crew-chat image pushes being silently swallowed). | Applied — confirmed |
| `20260817000000_notification_message_identity_dedupe.sql` | `notifications.message_id` + 7-arg `create_notification`, identity-based dedupe for image-only sends. | Applied — confirmed |
| `20260818000000_active_chat_presence.sql` | New `active_chat_presence` table backing push suppression for an actively-viewed thread. | Applied — confirmed working end-to-end on real devices as of the most recent dated entries. **Two older entries in the same doc (a static reference table and one narrative round) say "not applied" — those are stale and superseded by later, more specific confirmation. This is a concrete example of why the doc's own "a passing audit describes the database at that moment" warning matters.** |

**`scripts/*.sql` are a separate, older layer, not versioned migrations**, and several are load-bearing for security (§6): `setupEventCrewChat.sql`, `setupSecurityHardening.sql`, and the private-profile-fields rollout script. Their Production-applied status could not be independently confirmed from this environment either — see §6's BLOCKER item.

### 3b. Important tables (schema/RLS summary)

| Table | Key columns | RLS model |
|---|---|---|
| `notifications` | `user_id text`, `type` (checked enum), `reaction_id`/`message_id uuid` (both nullable, **no FK enforced** — loosely-coupled identity keys only) | select/update own-row only; **no delete policy**; **INSERT revoked from `authenticated` entirely** — the only creation path is `create_notification()` |
| `push_subscriptions` | `user_id uuid` FK straight to `auth.users(id)` (unlike most tables, which use a `text` column matched via the `auth_user_id()` helper), `endpoint` globally unique, `is_active` | select/insert/update/delete all own-row via `auth.uid()`; `grant all … to service_role` for `push-send` |
| `active_chat_presence` | `user_id uuid` PK (one row per user) → `auth.users(id)`, `thread_link text`, `updated_at` | same as `push_subscriptions` — direct `auth.uid()` comparison, `service_role` grant for `push-send` |
| `booking_requests` | `sender_id`/`recipient_id text`, `event_id` (nullable, **no FK enforced**), `status`/`rate_mode`/`proposed_rate_status` (checked enums) | select if sender or recipient; three separate update policies (recipient-accept/decline, sender-cancel, sender-archive-noop); **no delete policy** |
| `messages` | dual-purpose row — `conversation_id` set (DM) XOR `event_id` set (crew chat), **no CHECK constraint enforces exactly one** | DM branch scoped by conversation membership; crew-chat branch has a `select` policy but insert relies on `user_id = self` without an explicit crew-membership check *inside that specific policy* (worth a closer look if re-auditing); **no update policy for crew-chat messages at all** |
| `events` | `owner_id text`, `status` (checked enum), `history_hidden_at` | select: owner OR any user with a booking request on the event (any status); insert/update/delete: owner only |
| `conversations` / `conversation_members` | composite PK on members | **select-only policies** on both — INSERT explicitly revoked from `authenticated`; the only creation path is `start_dm()` |
| `message_reactions` | unique `(message_id, user_id, emoji)` | select/insert policies exist; **update/delete are grant-present but have no matching policy — RLS-blocked despite the grant** (a maintenance trap: adding a matching policy later would silently enable writes) |
| `message_attachments` | `conversation_id` **not FK-enforced** | select (member) / insert (uploader = self + member + matching message exists); no update/delete policy or grant (consistent) |

### 3c. RPCs and triggers

**RPCs** (all `security definer`, all `revoke … from public` + `grant execute … to authenticated`, no exceptions found): `create_notification` (evolved across 5 migrations to its current 7-arg form — each signature change explicitly `drop function if exists` first rather than `create or replace`, specifically to avoid the ambiguous-overload errors this project hit in Production before, see §10), `hide_event_from_history`/`hide_events_from_history`, `hide_booking_request_from_history`/`hide_booking_requests_from_history`, `archive_booking_request`, `ensure_event_crew_chat_auto_started`, `revoke_reaction_notification`, `can_view_event_run_sheet`. **`cancel_booking_request` is not in `supabase/migrations/` at all** — it only exists in legacy `scripts/setupBookingCancellation.sql` / `setupAcceptedBookingCancellation.sql`; any future change to it needs a new migration, it won't be found by searching `supabase/migrations/`.

**Triggers — important reproducibility gap.** No `create trigger` statement exists anywhere in `supabase/migrations/` or `scripts/*.sql`. The notification → push pipeline's "DB trigger on `notifications` INSERT" is real and confirmed live (via `push-send`'s own header comment, its `x-push-webhook-secret` auth model, and its Database-Webhook-shaped payload handling), but it is a **Supabase Database Webhook configured through the Dashboard**, not SQL in this repo. **A fresh environment cannot be stood up from this repo alone** — the webhook (target: the deployed `push-send` function URL, event: INSERT on `public.notifications`, header: `x-push-webhook-secret`) would need to be manually recreated in the Supabase Dashboard. Worth documenting explicitly if this project is ever migrated to a new Supabase project.

### 3d. Unusual grants

- **`revoke insert … from authenticated`** on `conversations`/`conversation_members`/`notifications` is intentional (forces RPC-only creation) — but means a stray client-side `.insert()` against these tables fails with a *grant* error, not an RLS error, a different debugging signal to know about.
- **The one confirmed historical "wider than intended" finding**: Production once ran a `messages` insert policy (`TO public … WITH CHECK (true)`) that **never existed in this repo's version control** — meaning the live DB had silently diverged from what's in git. Already remediated (`20250715213000`), but it's the concrete proof behind this project's own repeated warning that Production RLS state and the migrations folder are not guaranteed to be the same thing.
- **Grant/policy mismatches** (grant is broader than any matching policy, so the extra grant is inert but should be cleaned up if re-auditing): `event_run_sheet_columns`/`event_run_sheet_rows` grant `insert, update, delete` with only a `select` policy backing them; `message_reactions` grants `update, delete` with no matching policy either. Not exploitable today (RLS default-denies), but a landmine if a policy is added later without re-checking the grant.
- `service_role` grants exist **only** on the two 2026-08 tables (`push_subscriptions`, `active_chat_presence`) — any future service-role-driven job against the original 12 baseline tables would need its own explicit grant added first.

---

## 4. Push notification architecture

The full pipeline, as it exists in the repo today:

```
message/event sent
  → createNotification(...) in lib/notifications.ts
      → RPC create_notification(p_user_id, p_type, p_title, p_body, p_link,
                                 p_reaction_id, p_message_id)
      → INSERT into public.notifications
          → DB webhook (pg_net) on notifications INSERT
              → POST to push-send Edge Function, authenticated via
                x-push-webhook-secret (constant-time compared)
                  → push-send re-fetches the notification row itself
                    (never trusts the webhook payload's body)
                  → active-chat-presence suppression check (see below)
                  → fetch active push_subscriptions for the recipient
                  → web-push (VAPID) send to each subscription
                      → 404/410 response → deactivate that subscription row
                  → Apple/browser push service → device
                      → public/sw.js 'push' event → shows the notification
                      → public/sw.js 'notificationclick' → navigates the
                        existing client (client.navigate(link), with a
                        postMessage fallback) or opens a new window
                          → app hydrates, useChatMessageTargetScroll (or
                            the booking-card fallback) scrolls to and
                            highlights the target message
```

**`message_id` dedupe model.** `notifications.message_id` (nullable) identifies the real chat message (if any) a notification is about. `create_notification`'s dedupe branches on it: when present, dedupe is scoped to `(user_id, message_id)` — idempotent for an accidental duplicate call on the same message, but never collides with a *different* message even if the title/body/link are identical (this is what makes two consecutive image-only "Sent a photo" messages both push). When absent (booking/system notifications with no underlying message row), dedupe falls back to a content fingerprint. **Argument position matters and has bitten this project twice**: `createNotification(userId, type, title, body, link, reactionId, messageId)` — `messageId` is the *seventh* argument. Sliding it into slot six (`reactionId`) doesn't throw (that column has no FK), it silently writes to the wrong column and drops the real one. A shared `assertMessageIdIsSeventhArgument` guard now pins every call site — see §10.

**Active-chat suppression.** `public.active_chat_presence` — one row per user, holding the exact bare thread link (`/dm/<id>` or `/events/<id>/chat`, no query string) the user's client last reported as actively visible, refreshed on a 20s client heartbeat while the tab is visible, cleared on hide/unmount/`pagehide`. `push-send` checks this table (scoped to `notification.type === "message"` only, exact string match on `thread_link`, under a 45s TTL as the backstop for whenever the client-side clear couldn't fire) before sending, and fails open (try/catch, sends normally) on any error including a missing table. See §10 for the specific bug this feature shipped with and how it was found.

**Booking-card fallback targeting.** A booking-lifecycle notification (accepted/withdrawn/cancelled, rate proposed/accepted/declined) can point at a DM timeline notice that a *later* notice has since superseded and hidden from the timeline — the original message genuinely never renders, so no amount of retrying the scroll-to-target finds it. Rather than dumping the reader at the bottom, `useChatMessageTargetScroll` accepts a `fallbackTargetSelector` so the caller can offer the still-visible booking card for the same booking instead.

**Stale subscription reconciliation.** `lib/push/client.ts`'s `detectNotificationState()` recognises a `"reconnect"` state: browser permission already granted, but either the browser's own `PushSubscription` is gone or there's no matching active DB row for the signed-in user. Until this round, that state was only ever checked on the Settings page, so recovery required the user to notice and manually re-enable. `ServiceWorkerProvider` (mounted once per app launch) now checks it itself and silently re-subscribes when signed in — no user gesture needed to resubscribe once permission is already granted, only the original prompt needs one.

**iOS/PWA requirements.** Push requires the app installed to the Home Screen (`ios_not_installed` state) and iOS 16.4+ (`unsupported_ios_version` state) — both detected and surfaced distinctly in `detectNotificationState()`. `public/sw.js` is served as a plain Vercel static asset with `cache-control: public, max-age=0, must-revalidate`, plus `skipWaiting()`/`clients.claim()` in the file itself, so an updated worker takes over on the next load without requiring the user to force-close the app.

**Edge Function deployment is separate from Vercel.** `supabase/functions/push-send/index.ts` is deployed independently via the Supabase CLI (`supabase functions deploy push-send --project-ref gidplxriruttihfirvii --no-verify-jwt`) — merging to `main` and a Vercel deploy do **not** touch it. **This has already caused a full day of silently-dead functionality once** (see §10) and cannot be confirmed from this environment; the incoming engineer should run `supabase functions list --project-ref gidplxriruttihfirvii` and diff the deployed source against `supabase/functions/push-send/index.ts` on `main` before trusting that the repo describes what's live.

**Repo-vs-deployed match:** **not confirmed this round** — no Supabase CLI / API access from this environment.

---

## 5. Environment / deployment

**Naming only below — no values.**

### Vercel (Next.js app)

| Variable | Exposure |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) — security boundary is RLS, not key secrecy |
| `NEXT_PUBLIC_APP_URL` | Public |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Public |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public — must be HTTP-referrer restricted in Google Cloud Console |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public — must match the `VAPID_PUBLIC_KEY` set as a Supabase Edge Function secret (see below); these are two copies of the same keypair's public half, stored in two different systems |
| `NEXT_PUBLIC_FTC_APP_VERSION`, `NEXT_PUBLIC_FTC_BUILD_ID` | Public, build metadata |
| `NEXT_PUBLIC_FTC_AI_EVENT_GENERATION_ENABLED` | Public — client-side flag for the (currently disabled) AI event-plan UI |
| `OPENAI_API_KEY` | **Server-only.** Used by `app/api/generate-event`, which requires a Supabase Bearer token — do not add a `NEXT_PUBLIC_` alias |
| `FTC_AI_EVENT_GENERATION_ENABLED` | Server-only flag gating `/api/generate-event` itself (returns 404 when unset, not a revealing error) |
| `FTC_AGENT_ROOM_ENABLED` | Server-only — gates the internal `/api/dev/agent-room` tooling, should be off/absent in Production |

### Supabase Edge Function secrets (`push-send`, set via Supabase dashboard/CLI, not Vercel)

| Variable | Purpose |
|---|---|
| `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` | Web Push signing keypair |
| `PUSH_CONTACT` | VAPID subject (a `mailto:` contact) |
| `PUSH_WEBHOOK_SECRET` | Shared secret the DB webhook must present in `x-push-webhook-secret`; compared constant-time |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Auto-provisioned by Supabase for every Edge Function; used to bypass RLS and read the authoritative notification/subscription/presence rows server-side. **Confirmed used only here** — not present anywhere in Next.js app code or the Vercel env (see §6). |

### Local development only (`.env.local`, gitignored; `GOOGLE_PLACES_API_KEY` is script-only, not required for `npm run dev`)

Same public/server vars as the Vercel table above, plus:

| Variable | Purpose |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Only used by `scripts/buildVenueDatabase.ts`, a one-off local script — not required to run the app |

### QA end-to-end credentials (`.env.qa.local`, gitignored, never committed)

`FTC_QA_PLANNER_EMAIL`/`_PASSWORD`, `FTC_QA_DJ_EMAIL`/`_PASSWORD`, `FTC_QA_BOTH_EMAIL`/`_PASSWORD`, optional `FTC_QA_BASE_URL`. See `.env.qa.local.example` and `docs/qa/AUTHENTICATED-E2E.md`. **Not present in this working environment** — QA-authenticated Playwright runs and this round's §11 smoke check could not be executed here.

### Deployment process

1. Merge to `main`.
2. If the change includes a new/changed file under `supabase/migrations/`: paste and run it in the Supabase SQL Editor (manual — nothing automates this).
3. If the change touches `supabase/functions/push-send/`: `supabase functions deploy push-send --project-ref gidplxriruttihfirvii --no-verify-jwt` (manual — Vercel does not do this; keep `--no-verify-jwt`, the function does its own webhook-secret auth).
4. Vercel auto-deploys the Next.js app from `main`.
5. If any SQL was applied by hand in step 2: rerun `scripts/supabaseSecurityAuditChecklist.sql` + `scripts/supabaseSecurityAuditChecklistSupplement.sql` (read-only) before calling the release done — see §3.

Full detail: `docs/handoff/SUPABASE.md`, `docs/handoff/SECRETS.md`.

---

## 6. Security handover

Concise read-only sanity review (not a refactor). Full findings; classified BLOCKER / SHOULD FIX SOON / DEFERRED.

**BLOCKER (verification, not a code fix) — confirm two hardening scripts actually ran in Production.**
The baseline migration (`supabase/migrations/20250101000000_baseline_phase2c.sql`) alone leaves two policies wider than intended:
- `messages_insert_event_sender` does **not** check crew membership — any authenticated user could insert into any event's crew chat as written. `scripts/setupEventCrewChat.sql` supersedes it with `messages_insert_event_crew`, which adds an `is_event_crew_member_for_message(...)` check.
- `messages_update_conversation_member` lets any conversation member edit any other member's message text. `scripts/setupSecurityHardening.sql` tightens it to own-messages-only (plus booking-sync exceptions).

Both scripts are documented as required in `SECURITY_AUDIT.md`'s own "Critical"/"High" findings from 2026-07-06. **Whether they've actually been run against Production cannot be determined from a static repo scan** — this is exactly what `scripts/supabaseSecurityAudit.sql` (or the newer `scripts/supabaseSecurityAuditChecklist.sql` + `Supplement.sql`, both read-only) exists to answer. **Run it before treating this as resolved.**

**SHOULD FIX SOON:**
- `/api/generate-event` and `/api/account/delete` have no rate limiting. Both require authentication, so this is abuse-cost risk from a valid account (repeated OpenAI spend, deletion-attempt spam), not an open door — already flagged in `SECURITY_AUDIT.md` as a manual next step, still true today.
- Confirm the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` browser key is actually HTTP-referrer-restricted in Google Cloud Console — can't be verified from the repo.

**DEFERRED / doc-only:**
- `docs/handoff/SECRETS.md` states `SUPABASE_SERVICE_ROLE_KEY` is "not used in app code" — stale now that `push-send` legitimately uses it (server-side, Edge Function only, auto-provisioned by Supabase). Worth a one-line doc fix, not a code change.

**PASS / no action needed (verified, not just documented):**
- **Service-role isolation.** Every `SUPABASE_SERVICE_ROLE_KEY` reference in the repo is either the `push-send` Edge Function (correct), documentation, or a fake string literal in a test fixture for `lib/agentRoom/redaction.ts`'s secret-redaction test. No client-bundled code or API route constructs a service-role client.
- **Client exposure.** `next.config.ts` only injects non-sensitive build metadata into the client bundle. No sensitive variable name carries an accidental `NEXT_PUBLIC_` prefix.
- **`push-send`'s own security.** Webhook-secret check happens before any DB call or body parsing; `constantTimeEqual` never short-circuits on a byte mismatch; the notification is always re-fetched server-side by ID rather than trusting webhook-payload fields; no response body or log line ever echoes a secret value.
- **Endpoint auth inventory.** The one Edge Function (`push-send`) and all `app/api/*` routes (`account/delete`, `generate-event`, the 8 `dev/agent-room/*` routes) all require appropriate auth for what they do; the dev-tooling routes are hard-refused whenever `process.env.VERCEL` is set, so they cannot be reachable on Vercel regardless of the feature flag.
- **PII table RLS.** Spot-checked exact policy predicates for `push_subscriptions`, `notifications`, `user_private_data`, and `active_chat_presence` — all four scope every operation to `user_id = auth.uid()` (or the equivalent `auth_user_id()` helper), no blanket-authenticated grants.
- **Two prior dedicated security rounds are merged and complete:** `claude/phase-2b-security` (automated secret-scanning + pgTAP RLS tests in CI, not app-code changes) and `claude/p1-private-profile-security` (moved `dj_booking_contact_name`/`full_name` off the blanket-readable `users` table into the owner-scoped `user_private_data` table — confirmed complete in code, not just planned).

---

## 7. Repo hygiene

**Scratch/diagnostic scripts.** Everything under `scripts/*.ts`/`*.mts` is either wired into the regression suite (`test-regressions.mts` dynamically imports 10 standalone runtime test files — all legitimate), wired into an `npm run qa:*` script, or documented ops tooling (`ftc-worktree.sh`). One script has no wiring anywhere: `scripts/buildVenueDatabase.ts`, a one-time Google Places scraper that regenerates `lib/data/melbourneVenues.ts`. It's documented in `SECRETS.md` as optional/local-only, so it's not undocumented cruft — just flagging it so it isn't mistaken for a test or run by accident.

**Leftover debug logging — real finding, low risk but worth a cleanup pass.** This codebase has an established, intentional convention: `console.error("[module-tag] message", err)`, module-tagged, part of the real error-handling design (`[push]`, `[push-send]`, `[notifications]`, `[sw]`, etc. — not flagged). Separately, several `console.log` call sites look like leftover ad-hoc debug traces: unconditional (no `NODE_ENV` gate, unlike the properly-gated debug blocks that exist elsewhere in the *same files*), using throwaway formatting (emoji markers, `"====="` dividers), and dumping raw IDs on hot paths:
- `lib/bookingRequests.ts:1051-1156` — ~14 emoji-marked debug lines in the event-cancellation message path.
- `lib/events.ts:795-850` — ungated logging in `notifyCancelledBookingsFromEventCancellation`/`cancelEvent`.
- `lib/messageReads.ts:199-310` — ungated, fires on every DM/conversation read-receipt update.
- `lib/groupChats.ts:126-134,508-519` and `lib/dmInbox.ts:169-170,325-334` — two exported "trace" helpers (`logGroupRenderedRowIds`, `logInboxRenderOrder`) called unconditionally on **every render** of the DM inbox page (`app/dm/page.tsx`).
- `lib/useChatNewMessageHighlight.ts:14-18` — fires on every incoming DM message.

None of these are a security or correctness risk — they're `console.log` noise, not data exposure — but they inflate browser console output in Production on hot paths and should be gated behind `NODE_ENV !== "production"` (the pattern already exists correctly elsewhere in the same files) or removed. **Cosmetic/post-beta, not a blocker.**

**TODO/FIXME/XXX/HACK comments.** None found anywhere in tracked source (`app/`, `lib/`, `scripts/`, `supabase/`, `e2e/`). This codebase resolves issues in-line rather than leaving markers.

**Untracked files / generated files / secrets.** Working tree is clean — no untracked files. No build artifacts, `.next/`, `node_modules/`, or stray lockfiles tracked; `.gitignore` coverage is correct and complete. No real secret values found tracked anywhere — the only credential-shaped strings in the repo are fake fixtures inside `test-regressions.mts`'s redaction-logic tests. `.env.local` / `.env.qa.local` are correctly gitignored and not tracked.

**Stale branches.** Local (non-`main`) branches: `claude/p1-private-profile-security` and `claude/phase-2b-security` are both fully merged into `main` (0 commits ahead) — safe to delete. `claude/beta-help-final` (1 unmerged commit) and `claude/phase-2c-migration-bootstrap` (27 unmerged commits) have real unmerged work — **do not delete without review.** `origin` carries roughly 103 remote branches (mostly `cursor/*`, `feature/*`, `fix/*` prefixed) — a general hygiene observation, not individually triaged; worth a bulk cleanup pass by whoever owns repo administration, but not investigated branch-by-branch here.

---

## 8. Known technical debt / known issues

**Beta blocker: none currently open**, as far as this audit found — the last several rounds recorded in `CURRENT-STATE.md` were all "fixed and verified" or "hardening, not a confirmed root cause but safe" entries, not open blockers. The closest thing to an open blocker is §2's untested regression-suite tail and §6's BLOCKER-classified *verification* item (confirm two RLS hardening scripts actually ran in Production) — both are "go check," not "go fix."

**Post-beta priority (real, not speculative — each verified to still exist in code/docs this round):**
- Rerun `scripts/supabaseSecurityAuditChecklist.sql` + `Supplement.sql` against Production (§3, §6) — overdue per the project's own `REL-05a` standing rule.
- No rate limiting on `/api/generate-event` / `/api/account/delete` (§6).
- Leftover ungated debug `console.log` calls on several hot paths (§7) — noise, not a security issue.
- The regression suite's standing pre-existing failure (§2) should be root-caused, both for its own sake and because it's been masking whether everything registered after it in `main()` still passes.

**Cosmetic/deferred, already documented and accepted for this beta** (`docs/qa/KNOWN-ISSUES.md`, dated 2026-07-16 — re-read, not re-verified live this round, since several concern exactly the DM/crew-chat back-navigation paths this session's later rounds touched; **the incoming engineer should spot-check these are still accurate rather than trust the date**):
- KN-01 — DJ profile tap on an event-detail Bookings row doesn't register (workaround: open profile from Run Sheet/DM instead).
- KN-02 — ~~Event → Open DM → Back~~ **Resolved** (Production verified 2026-09-01). See `docs/qa/KNOWN-ISSUES.md`.
- KN-03 — Profile tab occasionally responds slower than Messages.
- KN-04 — Crew chat → View event → Back is not always origin-preserving.
- KN-05 — Some secondary Run Sheet/profile return paths land on event detail rather than the prior screen.
- KN-06 — Event name/venue fields have no sensible character caps.
- Explicitly out of scope for this beta (by product decision, not a bug): AI event generation (disabled), payments, Discover expansion, social features beyond DMs/crew chat, public/open signup.

**Do not treat this as a new backlog.** These are what's already known and accepted; nothing here should be picked up speculatively without the incoming engineer independently re-confirming it's still true and still matters.

---

## 9. Architecture map

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Supabase (Postgres + Auth + Storage + Realtime), deployed to Vercel. One Supabase Edge Function (Deno). Web Push via `web-push` + VAPID for notifications; no separate native app.

| Area | Key files/directories |
|---|---|
| **Events** | `lib/events.ts`, `lib/events/` (query-field fallback logic, crew-chat link building, invite messages), `app/(planner-workspace)/events/EventsPageClient.tsx`, `app/events/`, `app/event/` |
| **Booking requests** | `lib/bookingRequests.ts`, `lib/bookings/` (send flow, calendar/gigs navigation), `lib/bookingRate.ts`, `lib/bookingPlans.ts` + `lib/bookingPlans/` |
| **DMs** | `app/dm/[conversationId]/page.tsx` (the big one), `app/dm/page.tsx` (inbox), `lib/dm/` (booking-target scroll, scroll restoration, thread navigation), `lib/dmAttachments.ts`, `lib/dmInbox.ts`, `lib/dmReactions.ts`, `lib/startDm.ts`, `lib/messageReads.ts` |
| **Crew chat** | `app/events/[eventId]/chat/page.tsx`, `lib/eventCrewChat.ts`, `lib/groupChats.ts`, `lib/groupChatAttachments.ts`, `lib/groupChatMessageLayout.ts`, `lib/groupChatSystemMessages.ts` |
| **Run sheet** | `lib/eventRunSheet.ts`, run-sheet components under `app/components/` (search for `RunSheet`) |
| **Gigs/availability** | `lib/djGigsCalendarCache.ts`, `lib/djGigsCalendarPrefetch.ts`, `lib/djAvailability.ts`, `lib/calendar.ts` + `lib/calendar/`, `lib/plannerCalendarItemsCache.ts`, `lib/plannerCalendarPrefetch.ts` |
| **Notifications (in-app)** | `lib/notifications.ts`, `app/notifications/page.tsx`, `lib/navigationBadges.ts` + `lib/navigationBadgeCache.ts`/`Prefetch.ts`, `app/components/navigation/NavBadgeProvider.tsx` |
| **Push notifications** | `lib/push/client.ts` (subscribe/detect/reconnect), `app/components/ServiceWorkerProvider.tsx`, `public/sw.js`, `supabase/functions/push-send/index.ts`, `lib/chat/useActiveChatPresence.ts`, `lib/chat/messageTargetScroll.ts` — full pipeline in §4 |
| **Shared chat/scroll helpers** | `lib/useChatScroll.ts` (the shared scroll-pin/ResizeObserver machinery underneath both DM and crew chat), `lib/dm/chatBookingTarget.ts`, `lib/chatNewMessageHighlight.ts` / `useChatNewMessageHighlight.ts`, `lib/chatBookingFocusHighlight.ts` / `useChatBookingFocusHighlight.ts` |
| **Auth/user** | `lib/user/currentUser.ts`, `lib/auth/`, `lib/supabaseClient.ts` (the one browser Supabase client) |
| **AI event-plan generation** (disabled behind a flag) | `app/api/generate-event/route.ts`, `lib/client/generate-event-plan.ts`, `lib/domain/event.ts`, `lib/application/generate-event-plan.ts`, `lib/infrastructure/openai/`, `lib/api/validateEventBrief.ts` |
| **Regression test harness** | `scripts/test-regressions.mts` (the main suite — thousands of source-level and a handful of real happy-dom/jsdom runtime tests, run via `npm run test:regressions`), plus ~10 standalone runtime test files it dynamically imports (`scripts/test-dm-*.ts`, `scripts/test-sw-notification-click.ts`, `scripts/test-message-target-scroll-priority.ts`) — see §2 and §7 for its known standing failure |
| **QA/E2E** | `e2e/` (Playwright, authenticated against Production with QA accounts), `docs/qa/` (test plan, regression checklist, release checklist, known issues, environment reset runbook) |
| **Supabase** | `supabase/migrations/` (versioned, manual-apply), `scripts/*.sql` (older bootstrap/hardening layer, also manual-apply), `supabase/functions/push-send/` (the one Edge Function) |

---

## 10. Known traps

Practical engineering lessons already paid for in this codebase. Read before touching the related area.

- **Supabase's `PostgrestBuilder` is a thenable, not a promise** — it only issues its HTTP request when `.then()` is actually invoked. `void someBuilder` (a common "fire and forget" idiom) builds the query and **silently discards it without ever sending it**. This exact bug made `active_chat_presence`'s heartbeat inert in Production for multiple QA rounds — RLS, grants, and schema all checked out perfectly because nothing was ever being sent to check against. Always `.then()` (or `await`) a Supabase query, even a "don't care about the result" one.
- **`createNotification(userId, type, title, body, link, reactionId, messageId)` — argument position is load-bearing.** `reaction_id` has no FK constraint, so sliding `messageId` into slot six doesn't throw — it silently writes to the wrong column, leaves `message_id` null, and the notification takes the wrong dedupe branch. Bitten this project twice. A shared `assertMessageIdIsSeventhArgument` guard now exists — keep using it for any new call site.
- **Notification dedupe is identity-based when a real message exists, content-based otherwise.** Two different messages with identical title/body/link (e.g. two consecutive image-only "Sent a photo" sends) must not collide — that's what `message_id`-keyed dedupe exists to prevent. But the reverse trap exists too: **generic, non-unique lifecycle text causes cross-booking collisions.** `"Rate declined"` as a bare constant is identical across every booking in a thread; an exact-text dedupe can match a *different* booking's row, thread that stale id, and `create_notification`'s identity dedupe silently swallows the real notification. Fix pattern: version the stored text with the entity's own id (`<label> · <event> · <bookingId>`), strip it for display only.
- **A hidden lifecycle message still needs a fallback deep-link target.** A booking notification can point at a DM timeline notice that's since been superseded and hidden — the message genuinely never renders, so retrying the scroll-to-target forever won't find it. `useChatMessageTargetScroll`'s `fallbackTargetSelector` exists so the caller can offer the still-visible booking card instead of just dumping the reader at the bottom.
- **`active_chat_presence` suppression must be exact-thread, TTL-bounded, and fail-open.** Compare the recipient's presence row's `thread_link` to the notification's `link` by exact string equality (not "any presence row exists"), enforce a TTL server-side (45s) since the client can't reliably clear its own row on a real force-quit, and wrap the whole check in try/catch so any failure — including a missing table — falls through to a normal send rather than silently black-holing pushes.
- **Stale browser/DB push-subscription mismatch is a real, recurring failure mode**, not hypothetical — a device can end up with a browser-side subscription the DB doesn't know about (or vice versa) with no error surfaced anywhere. `detectNotificationState()`'s `"reconnect"` state exists to name this; it must be checked proactively (on app launch, not only when a user happens to visit Settings) and resolved silently — re-subscribing needs no user gesture once permission is already granted, only the original prompt does.
- **Vercel does not deploy Supabase Edge Functions.** Merging to `main` and a green Vercel deploy say nothing about whether `supabase/functions/push-send/index.ts` on `main` matches what's actually running. This already cost a full day of silently-dead functionality once (repo was correct, deployed function was a day stale, two QA rounds passed it on source review alone because nobody thought to diff the live function). Redeploy explicitly after any change under `supabase/functions/`: `supabase functions deploy push-send --project-ref gidplxriruttihfirvii --no-verify-jwt`.
- **The optional-event-column fallback (`withEventFieldsFallback`) must make real progress on every retry, never repeat an identical query.** Its retry condition used to be "does the error match a known missing-optional-column pattern," which returns true even when the matched column was *already* marked missing — same projection, same query, same error, forever, and since the promise never settles, no `catch`/`finally` ever runs and a UI "Saving…" state can hang indefinitely (and can look like it created a duplicate row, though the underlying `INSERT … RETURNING` failure actually rolls back atomically in Postgres). The fix pattern generalizes beyond this one function: **any retry loop gated on "does this error match a recognized pattern" must also confirm the retry input actually changed, not just that the pattern matched again.**
- **PWA/service-worker bundle staleness on iOS.** `public/sw.js` is a plain static asset (not a Supabase Edge Function, so it *does* redeploy with every Vercel build) served with `cache-control: public, max-age=0, must-revalidate` plus `skipWaiting()`/`clients.claim()` already in the file, specifically so an updated worker takes over without requiring the user to force-quit. A related, separate trap already found and fixed here: on an iOS cold resume, `notificationclick`'s existing-client branch can fire *before* the page has hydrated and attached its `postMessage` listener — the navigation message is dropped silently, with no error, and the app just sits wherever it already was (often indistinguishable from "the push worked but didn't navigate"). Fixed by having the service worker call `client.navigate(link)` itself rather than depending on page-side timing, with `postMessage` kept only as a fallback.
- **A passing Supabase security audit is a snapshot, not a guarantee.** Setup/hardening SQL scripts get applied by hand, in an order nobody records. Running an older script after a newer one can silently reinstate a policy the newer one existed specifically to remove (`setupProductionRls.sql` recreates a policy `setupEventCrewChat.sql` exists to drop). Postgres permissive RLS policies are OR'd together — one leftover broad policy defeats every tighter policy beside it, with no error and no log line anywhere. Rerun the audit after *every* manual SQL application, not just once at launch.

---

## 11. Final Production smoke check

**Not performed live this round.** This working environment has no Supabase project access, no QA account credentials (`.env.qa.local` — gitignored, not present here), and no network egress to `follow-the-crowd.vercel.app` (`WebFetch` returns `EGRESS_BLOCKED` on every attempt). The core critical flows the task asked for — planner create-event → send-booking, DJ receive → accept/decline/withdraw, DM, crew chat, one normal DM push each direction, one booking lifecycle push — **could not be executed from here.**

What exists and is ready for whoever has real access to run this in minutes, not hours:
- `docs/qa/AUTHENTICATED-E2E.md` + `.env.qa.local.example` — authenticated Playwright-against-Production setup.
- `npm run qa:preflight` — validates the QA credential file is properly gitignored before any run touches Production.
- `npm run qa:e2e:prod` — runs the Playwright suite against Production with QA credentials.
- `docs/qa/TEST-PLAN.md` and `docs/qa/REGRESSION-CHECKLIST.md` — the exact critical-path scripts this smoke check maps onto, already written.
- `docs/qa/FTC-BETA-ENVIRONMENT-RESET.md` (§12) if QA account state needs resetting first — **read its warning about the detection-rule scope before running anything destructive.**

---

## 12. This document

This file (`docs/handoff/ENGINEERING-HANDOVER.md`) is the concise, current entry point for a new engineer. It supersedes nothing — the existing docs it references (`CURRENT-STATE.md`, `SUPABASE.md`, `SECRETS.md`, `SECURITY_AUDIT.md`, `docs/qa/*`) remain the detailed source of truth for their areas; this document tells you which of them are current and which have proven-stale sections, and gives you the one-page current-state summary none of them individually provide.

**QA accounts / reset process:** QA credentials live in `.env.qa.local` (gitignored, copy from `.env.qa.local.example`) — planner, DJ, and "both-role" test accounts, used for authenticated Playwright runs against Production. To reset QA account data without touching real beta testers' data: `npm run qa:reset` prints the runbook and scope summary; the actual reset runs as one paste of `scripts/resetQaEnvironment.sql` into the Supabase SQL Editor, scoped to QA-account detection rules (an `FTC QA` display name / `ftcqa_` username / `ftcqa`-ish email pattern). **Read `docs/qa/FTC-BETA-ENVIRONMENT-RESET.md` in full before running this** — it documents a real incident where the detection rules didn't match the actual QA accounts in use, and explicitly warns against loosening the detection regexes to "fix" that, since the tight gate below them is the only thing standing between a reset and a real user's data. The documented safe alternative for that situation is an explicit, reviewed target-id list, never a widened pattern.

**Immediate recommended engineer priorities**, roughly in order:

1. Confirm what Production is actually running (Vercel dashboard commit, `supabase functions list` for `push-send`'s deployed version) against `main` at `426bd4a5` — everything else in this document assumes the repo and Production agree, and that assumption has been wrong before (§4, §10).
2. Rerun `scripts/supabaseSecurityAuditChecklist.sql` + `Supplement.sql` against Production (§3, §6) — overdue per the project's own standing rule, and the one item this audit classified as a real BLOCKER-to-verify.
3. Root-cause `testWorkspaceGigsPendingDisplayCountPreservesLastKnown` (§2) — not because the failure itself looks dangerous, but because it's been silently preventing the rest of the regression suite from running end to end.
4. Recreate/document the Supabase Database Webhook that drives the push pipeline (§3c) — it exists only in the Dashboard, not in this repo, and isn't reproducible from source alone.
5. Run the QA/E2E smoke suite for real (§11) — this document's Production-behaviour claims are all sourced from static analysis and the project's own dated history, not a live check performed this round.
