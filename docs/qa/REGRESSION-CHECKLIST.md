# Regression Checklist

Focused smoke and regression pass for FTC. Run before each beta release or after significant changes.

**Target time:** 45–90 minutes (phone, then desktop)  
**Viewports:** **390px** (phone) and **1280px** (desktop) — both required per `FTC_WORKFLOW.md` §7.

**Status:** Not Started · In Progress · Passed · Failed · Blocked

---

## Quick smoke (15 min)

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-01 | Login with valid credentials → lands in app | Not Started | Critical |
| R-02 | Bottom nav (mobile) or top nav (desktop) shows correct tabs for role | Not Started | Critical |
| R-03 | `/events` list loads without error | Not Started | Critical |
| R-04 | Open an event detail → page renders | Partial | Critical |
| R-04a | `/events/create` redirects to `/events?create=event` | Partial | High |
| R-04b | Invalid event ID shows safe not-found (no Postgres/SQL error text) | Partial | High |
| R-05 | `/dm` inbox loads | Not Started | Critical |
| R-06 | Open a DM conversation → send a text message → appears | Not Started | Critical |
| R-07 | `/bookings` (Gigs) loads for DJ account | Partial | Critical |
| R-07a | Logged out → `/bookings` redirects to `/login` (no hooks crash) | Partial | Critical |
| R-07b | Stale cached role without session → safe redirect (no fatal screen) | Partial | Critical |
| R-07c | Planner / DJ / Both roles still reach correct Gigs experience | Not Started | Critical |
| R-08 | Sign out from Settings → returns to login | Not Started | Critical |

---

## Authentication & onboarding

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-10 | Signup new account (if test env allows) | Not Started | High |
| R-11 | Onboarding role selection persists after refresh | Not Started | High |
| R-12 | Profile setup required before full app access | Not Started | High |
| R-13 | Password reset sends email; button shows “Email sent” cooldown | Not Started | Medium |
| R-14 | Invalid login shows error; no crash | Not Started | High |

---

## Events & booking

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-20 | Create event with required fields → appears in Active list | Not Started | Critical |
| R-21 | Create event validation: missing finish time shows inline error | Not Started | Medium |
| R-22 | Invite DJs → booking request appears in DJ Gigs Incoming | Not Started | Critical |
| R-23 | DJ accepts booking → status updates on event lineup + DM card | Not Started | Critical |
| R-24 | Rate proposal: open offer → DJ can counter → accept flow | Not Started | High |
| R-25 | Cancel accepted booking with reason → status cancelled | Not Started | High |
| R-26 | Edit event (booking-impacting field) → confirmation → crew chat update (if chat open) | Not Started | Medium |

---

## Calendar & Gigs

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-30 | Calendar shows events on correct dates | Not Started | High |
| R-31 | Cancelled event hidden from calendar (still in History) | Not Started | Medium |
| R-32 | Gigs mobile calendar card → tap opens event or DM | Not Started | High |
| R-33 | Gigs → Open conversation deep-links to booking card in DM | Not Started | Medium |
| R-34 | DJ availability save on mobile (optimistic, no layout jump) | Not Started | Medium |

---

## Messaging

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-40 | DM booking card expands/collapses; timestamps visible | Not Started | Medium |
| R-41 | View event from DM → Back returns to conversation | Not Started | Medium |
| R-42 | Crew chat accessible when 2+ DJs confirmed | Not Started | High |
| R-43 | Crew chat: new message appears without refresh | Not Started | High |
| R-44 | Messages unread badge on nav icon (mobile top-right) | Not Started | Medium |
| R-45 | Group tab in Messages inbox lists crew chats | Not Started | Medium |
| R-46 | DM inbox realtime: no message payload/content logs in production console | Failed | Medium |
| R-47 | Marketing home: no visible AI generate button (private beta) | Partial | Medium |
| R-48 | Manual create event via `/events?create=event` still works | Not Started | Critical |
| R-49 | Production security audit 16/16 pass | Blocked | Critical |
| R-50 | DM send after public-insert policy removed | Blocked | Critical |
| R-51 | Crew-chat send after public-insert policy removed | Blocked | Critical |

---

## History & read-only

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-55 | Past/cancelled event detail is read-only (no Edit) | Not Started | Medium |
| R-56 | Remove event from History → hidden from list (not deleted) | Not Started | Medium |
| R-57 | Gigs History bulk remove works | Not Started | Low |

---

## Performance & polish

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-60 | Hard refresh while logged in → app loads without long blank screen | Not Started | Medium |
| R-61 | Planner workspace tab switch (Events/Calendar/Gigs) — no stuck loading | Not Started | Medium |
| R-62 | Profile photo tap → fullscreen animate → close via backdrop | Not Started | Low |
| R-63 | No raw UUIDs visible in UI | Not Started | Medium |

---

## Retest record — 2026-09-01 (code + build gates only)

Retest pass at commit `e1927a0`, run in a container with **no beta credentials and no live
environment**. `.env.qa.local` is absent, so `npm run qa:e2e:prod` blocks before any test
(by design — see `AUTHENTICATED-E2E.md`), and no browser session at 390px or 1280px was
possible. **No row below was moved to Passed**, because nothing here was behaviourally
verified on either reference viewport, which `FTC_WORKFLOW.md` §7/§8 requires.

### Automated gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed — all routes compiled |
| `npm run qa:preflight` | Passed (credential-file ignore rules verified) |
| `npm run test:regressions` | **Failed** — halts at test 86 of 305; 219 tests never run. See [BUG-2026-09-01-regression-suite-halt.md](./bugs/BUG-2026-09-01-regression-suite-halt.md) |

**Follow-up (2026-09-01):** harness fix shipped — `npm run test:regressions` now completes all 305 tests. See `docs/handoff/CURRENT-STATE.md` (Regression suite halt — fixed).
| `npm run qa:e2e:prod` | Blocked — no `.env.qa.local` |
| `npm run lint` | 179 errors / 142 warnings, dominated by `react-hooks` ref/render rules in `app/`. Not a checklist gate, and this pass did **not** establish whether it is pre-existing — flagged for the Builder to baseline, not filed as a bug |

### Items carrying "Partial" — what the code shows

Evidence is static (source + built output). Each still needs a live pass to move to Passed.

| # | Code-level finding | Residual gap |
|---|--------------------|--------------|
| R-04a | `app/events/create/page.tsx` redirects to `/events?create=event`, preserving an `eventDate` param. Route present in the build manifest | Not exercised in a browser |
| R-04b | Both invalid-ID paths are safe: a non-UUID `eventId` fails `looksLikeUserId()` and never reaches the database; a well-formed but unknown ID returns no row. Both render "Event not found or you do not have access" (`app/events/[eventId]/page.tsx:578`, `:604`, `:1393`). `getEventsLoadErrorMessage()` maps Postgres `22P02` to the same safe copy and collapses any other Supabase message to "Failed to load events" (`lib/events.ts:1068`) | Not exercised in a browser. Separately noted: the `42P01` / `PGRST205` / `42703` branches surface setup copy naming `scripts/*.sql`. Only reachable with a mis-provisioned database, so not filed — worth a Builder decision on whether that text should be user-facing at all |
| R-07a / R-07b | `OnboardingGuard` keeps a stable hook order on every path (no early `return` before hooks) and redirects to `LOGIN_PATH` when `getCurrentAuthUser()` is empty, on a 15s timeout. Module-scope badge prefetches are gated on a real session via `readSupabaseSessionUserIdSync()`, so a stale cached role alone cannot drive `authenticated`-only queries | Not exercised in a browser. Noted: the `[auth-diagnostic]` `console.warn` at `OnboardingGuard.tsx` is marked TEMPORARY and fires in production on every logged-out guarded route |
| R-47 | The marketing home's AI block, hero copy and "Generate AI Event Plan" button are all behind `isAiEventGenerationEnabled()` (`NEXT_PUBLIC_FTC_AI_EVENT_GENERATION_ENABLED === "true"`, absent by default). `POST /api/generate-event` independently returns 404 unless `FTC_AI_EVENT_GENERATION_ENABLED` is set | Cannot confirm the Vercel production env from here — needs someone to check the deployed env vars or load the live page |
| R-46 | **Failed.** Message metadata (and in one case a message's `text`) still reaches the production console. See [BUG-2026-09-01-production-console-logging.md](./bugs/BUG-2026-09-01-production-console-logging.md) | — |

### Items left untested

* **R-49 / R-50 / R-51** stay **Blocked** — production Supabase access required.
* Every remaining row stays **Not Started**: all need an authenticated session with a
  planner, a DJ and ideally a "both" account, on both reference viewports.

---

## Regression sign-off

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Tester | Claude Code — automated QA retest (no live environment) |
| Commit / deploy | `e1927a0` (branch `claude/qa-retest-2j2077`) |
| Phone (~390px) | Not Started — no browser session available |
| Desktop (~1280px) | Not Started — no browser session available |
| Intentional responsive differences noted | None observed; no viewport testing performed |
| Unintended parity failures | None observed; no viewport testing performed |
| Overall status | Blocked |
| Critical failures | None found. One High (regression suite halt, tooling) and one Medium (R-46 production console logging) filed under `docs/qa/bugs/` |
| Notes | Code and build gates only. Phone/desktop parity per `FTC_WORKFLOW.md` §7 is **not** signed off by this pass — a credentialed run is still required before release |

**Next step if Passed:** Proceed to [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)  
**Next step if Failed:** File bugs via [BUG-TEMPLATE.md](./BUG-TEMPLATE.md)
