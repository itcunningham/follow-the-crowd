# Follow The Crowd (FTC) — ChatGPT context

Paste this whole file into a **new ChatGPT chat**, then add your task at the bottom.

---

## What this is

**Follow The Crowd (FTC)** — a mobile-first Next.js + Supabase app for **promoters/planners** and **DJs**.

- Promoters create events, save event plans, use a calendar, send booking request DMs, manage lineups/run sheets, and run event crew group chats.
- DJs discover profiles, receive booking requests, propose/accept rates, manage availability, and chat in DMs + crew chats.

**Local repo path:** `/Users/isaaccunningham/Projects/FTC`  
**GitHub:** `itcunningham/follow-the-crowd`  
**Branch:** `main` (auto-deploys to Vercel production)

Legacy folder name **eventos** still appears in some docs — same project.

---

## How we split work

| Who | Job |
|-----|-----|
| **Isaac** | Product owner. Runs SQL in Supabase SQL Editor. Manual QA. Approves direction. |
| **ChatGPT (you)** | Planning, specs, QA checklists, bug write-ups, Cursor prompt drafting, SQL sanity-check. **No repo access.** |
| **Cursor Agent** | Reads `docs/handoff/`, implements code, runs `npm run build`, commits/pushes when asked. |

**Typical flow:** Idea → ChatGPT optional → paste task into Cursor → Cursor builds → **Cursor updates `docs/handoff/`** → Isaac runs new SQL if any → Isaac tests → Cursor commits/pushes when asked.

Also see repo root **`FTC_WORKFLOW.md`** for Builder / Reviewer / QA roles on larger tasks. Handoff checklist: **`docs/handoff/HANDOFF-UPDATE.md`**.

---

## Isaac's preferences (short)

- **Simple and straightforward.** Minimal back-and-forth.
- **Do the work in Cursor** — don't make Isaac run steps the agent can run.
- **SQL:** when Isaac needs to run SQL, give **raw file contents only** — no fences, no lecture.
- **Small focused diffs.** Match existing patterns. Don't over-engineer.
- **Commit/push only when Isaac asks** (or task explicitly says to).
- Full list: `docs/handoff/USER-PREFERENCES.md`

---

## Stack

- **Next.js 16** App Router (`app/`) — APIs may differ from training data; check `node_modules/next/dist/docs/` before assuming Next APIs.
- **Supabase** — Postgres, Auth, Storage, Realtime, RPC functions.
- **TypeScript**, **Tailwind**, custom FTC classes in `app/globals.css`.
- **Deploy:** Vercel (production on push to `main`).

```bash
npm run dev
npm run build
```

---

## Roles & navigation

**User roles:** `promoter` | `dj` | `both`

**Planner sub-nav** (`PlannerEventsSubNav`, `lib/plannerEventsNav.ts`):

| Tab | Path | Who sees it |
|-----|------|-------------|
| Events | `/events` | Everyone |
| Event Plans | `/booking-plans` | Promoter / both |
| Calendar | `/calendar` | Everyone |
| Gigs | `/bookings` | DJ / both |

**Other main areas:** `/discover`, `/dm`, `/profile`, `/settings`, `/notifications`, `/group-chats`

**Mobile:** bottom nav below `md`. **Desktop:** top nav (`md:max-w-5xl`, aligned to page shell).

**Main nav badges:** shared `NavBadgeProvider` — Messages unread count and Gigs pending count use localStorage + in-memory runtime cache, seeded at module load so badges render with the nav (no pop-in on hard refresh). Gigs sub-nav badge uses same sync pattern via `useSyncExternalStore`.

**Planner workspace heading:** `PlannerWorkspacePage` derives the large page title from the active workspace tab via `resolvePlannerWorkspaceTitle()` in `lib/plannerEventsNav.ts` — Events / Event Plans / Calendar / Gigs. Calendar-origin create on `/events` shows **Calendar** when that tab is active.

---

## Core product (built)

### Auth & profiles
- Signup, login, onboarding, role selection, profile setup/edit
- Discover DJs, public profiles, genre tags, avatars

### Events
- Create / edit / cancel / delete events
- Fields: name, venue, date, start+finish time (**both required**), notes, optional flyer, fallback colour tile
- **Notes** section heading (not "About"); `ftc-profile-section-label` styling
- Optional event flyer (`event-covers` bucket); unified cover crop — 16:9 hero on detail/edit, `object-cover` thumbs on list
- 8 selectable fallback colours + Auto (slate = neutral only)
- Event list: Active + History tabs (planner); whole card opens detail
- **History:** bulk "Remove from history" (hides from UI, does not delete records)
- Inline **field validation** on create/edit (errors after Save attempt; no red input outlines on time fields)
- Notes validation: max length + line limit; disables save when invalid (same as Event Plans)

### Event details
- Hero with artwork tile, status badge, venue/date/time meta
- Run sheet (planner): table on `lg+`, cards below; auto-populated when DJ accepts
- Send booking requests modal; lineup filters (all / pending / accepted / declined)
- Crew group chat (2+ accepted DJs or manual start)
- Edit with confirmation when booking-impacting fields change → posts update to group chat
- Cancel event / delete event dialogs (**no trailing periods** on confirmation copy)
- DJ view: booking status, rate proposal panel, open DM

### Booking requests & DMs
- Booking requests sent via private DM conversations
- Statuses: `pending` | `accepted` | `declined` | `cancelled`
- **Rate proposals:** open offers ("Ask for rate") and fixed offers; DJ can propose counter-rate; accept/decline flows + DM system messages
- Booking cards in DMs show **live** event fields from `events` when `event_id` set
- Duplicate booking protection per event+DJ
- Accepted bookings: planner or DJ can cancel with reason

### Event Plans (`/booking-plans`)
- Saved templates: event name, venue, notes
- Create event from plan (prefills create form)
- Bulk delete with confirmation

### Calendar (`/calendar`)
- **Mobile:** horizontal date strip + selected-day agenda
- **Desktop:** month grid (wider) + day modal; same data/behaviour
- Status dot priority per date: **Accepted (green) → Pending (amber) → Upcoming (dark blue)** — Today styling is on the **tile outline**, not the dot
- Cancelled events **hidden** from calendar (list, dots, counts); still in History
- Agenda sorted by booking priority then start time
- Event cards: **`Event Name · Venue Name`** on one truncated line; coloured accent bar; status badge
- CTAs: **Create event** (sentence case), Saved Event Plans
- Create-from-calendar flow: Save event → **Confirm N DJ(s)** for invites

### Gigs / bookings (`/bookings`)
- DJ incoming gigs: Incoming / Confirmed / History tabs
- Planner can create booking campaign from here (deep link flow)
- Send/confirm DJ wording aligned with Events: **Confirm N DJ(s)**
- History bulk remove (per-user hides)

### Group chat
- Per-event crew chat for owner + accepted DJs
- Messages inbox Group tab; deduped by event
- Event edit posts booking-impacting update message
- Planner does not get unread from own group messages

### DJ availability
- `DjAvailabilityCalendar` — available / tentative / unavailable dates

### Settings
- Password reset, account deletion request

### Desktop layout (2026-07-12+)
- **Planner workspace shell:** shared `PlannerWorkspacePage` — Events, Event Plans, Calendar, Gigs at `md:max-w-5xl`
- **Messages inbox + DM:** centred column `max-w-2xl`, widens to `52rem` at `lg+`
- **Profile:** single-column mobile flow, centred at `lg:max-w-[52rem]`
- **Performance:** optimistic auth in `OnboardingGuard`; profile + nav role persisted to localStorage (userId-scoped); events list + group inbox caches survive hard refresh; profile fetch starts at module load

---

## UX & copy conventions (important)

- **Mobile-first** at 390px width
- **Visual:** dark navy surfaces, subtle borders, solid accent colours — **no glow, gradients, or neon**
- **Status colours** (`lib/ftcFlatStatus.ts`): primary/light-blue = Today tile; green = Accepted; amber = Pending; dark blue = Upcoming
- **Wording:** "Create event" (sentence case); "Notes" not "About"; "Confirm N DJ(s)" not "Send to N DJs" in planner booking flows
- **Punctuation:** no trailing periods on empty states or confirmation dialog bodies where recently cleaned up
- **No raw UUIDs** in UI
- **Reuse** existing booking/chat/calendar components — don't duplicate logic

---

## Key files (for specs & Cursor prompts)

| Area | Files |
|------|-------|
| Events CRUD | `lib/events.ts` |
| Booking requests | `lib/bookingRequests.ts` |
| Rate proposals | `lib/bookingRate.ts`, `scripts/setupBookingRateProposal.sql` |
| Calendar logic | `lib/calendar.ts` |
| Event form validation | `lib/events/eventFormFieldValidation.ts`, `lib/bookingDateTime.ts` |
| Notes limits | `lib/events/eventNotes.ts` |
| Group chat | `lib/groupChats.ts`, `lib/eventCrewChat.ts` |
| Planner UI / workspace shell | `app/components/planner/PlannerWorkspaceLayout.tsx`, `PlannerUi.tsx` |
| Planner nav + workspace titles | `lib/plannerEventsNav.ts`, `app/components/PlannerEventsSubNav.tsx` |
| Navigation badges | `app/components/navigation/NavBadgeProvider.tsx`, `lib/navigationBadgePrefetch.ts`, `lib/navigationBadgeCache.ts` |
| Main nav | `app/components/AppNavigation.tsx` |
| Messages inbox layout | `app/components/dm/MessagesInboxLayout.tsx` |
| Events list | `app/events/EventsPageClient.tsx` |
| Event detail | `app/events/[eventId]/page.tsx` |
| Calendar UI | `app/components/PlannerCalendar.tsx`, `PlannerCalendarMobileDateStrip.tsx` |
| Send bookings UI | `app/components/booking/SendBookingRequestsPanel.tsx` |
| Booking cards | `app/components/BookingRequestCard.tsx` |
| History bulk actions | `app/components/history/HistoryBulkManage.tsx` |
| Onboarding / perf | `app/components/OnboardingGuard.tsx`, `lib/user/currentUser.ts` |
| Event artwork | `app/components/events/EventArtworkTile.tsx`, `EventFallbackColourField.tsx` |

---

## Supabase / SQL

- **New schema:** add timestamped files under `supabase/migrations/` — Isaac pastes once in Supabase SQL Editor before deploy.
- **Legacy bootstrap:** `scripts/setup*.sql` for fresh projects / one-offs.
- **Isaac has NOT run SQL** unless he says so — never assume migrations are applied.
- Reference: `docs/handoff/SUPABASE.md`, `supabase/README.md`

**Notable migrations:**
- `20250710120000_event_history_hide.sql` — planner event history hide
- `20250710130000_booking_request_history_hides.sql` — per-user gig history hide

**Still required for archive tab:** `scripts/setupBookingRequestArchiving.sql`

**Rate proposals:** `scripts/setupBookingRateProposal.sql`

---

## Recent shipped work (last updated: 2026-07-13)

**Latest commit on `main`:** `86eb697` — update handoff docs and agent workflow rules

| Commit | Summary |
|--------|---------|
| `86eb697` | Handoff docs + agent workflow rules (`HANDOFF-UPDATE.md`, Cursor rules) |
| `93de0c2` | Planner page heading matches active workspace tab |
| `0444eac` | Faster cold start — localStorage profile/role, parallel auth, events/inbox cache |
| `9d1a5c7` | Messages badge sync hydration (mirrors Gigs pattern) |
| `fbd1bbb` | Messages badge first-load timing fix |
| `913efc4` | Gigs badge hydration timing fix |
| `564642e` | Messages inbox width aligned with DM |
| `37c445b` | Desktop profile single-column layout |
| `d961180` | Desktop planner workspace consistency |
| `1943163` | Optimistic auth + profile caching |

**Also shipped (earlier July 2026):**
- Shared `PlannerWorkspacePage` shell across Events / Event Plans / Calendar / Gigs
- Calendar date-strip dot priority (Accepted > Pending > Upcoming); venue on calendar cards
- Desktop/mobile planner UX parity; inline event form validation
- Calendar-origin create flow + Confirm N DJ(s) wording
- Cancelled events hidden from calendar; history bulk remove (Events + Gigs)
- Rate proposals (open/fixed offers, DJ counter-proposals)
- Navigation badge stabilisation (shared provider + cache)

For full feature inventory see `docs/handoff/CURRENT-STATE.md`.

---

## What ChatGPT should NOT do

- Don't invent features beyond the task
- Don't assume SQL is applied
- Don't give Isaac long manual checklists when Cursor can run build/tests
- Don't redesign UI — FTC is MVP, flat, mobile-first
- Don't suggest force-pushing `main`

---

## Writing a task for Cursor

Format as **one clear instruction block** Isaac can paste into Cursor. Include:

1. Read `docs/handoff/` (or `FTC_WORKFLOW.md` for formal tasks)
2. Specific goal and scope boundaries ("do not change X")
3. Files to inspect first (if known)
4. Whether to `npm run build`, commit, push, confirm Vercel
5. **After completion:** Cursor updates `docs/handoff/` per `HANDOFF-UPDATE.md`

**Example ending:**  
`Run npm run build, fix issues, commit with a clear message, push to main, confirm Vercel deploy. Update docs/handoff/. Return: files changed, commit hash, deploy status, handoff files updated.`

---

## Deeper reference in repo

| File | Purpose |
|------|---------|
| `docs/handoff/HANDOFF-UPDATE.md` | **Mandatory checklist when a job completes** |
| `docs/handoff/CURRENT-STATE.md` | Feature inventory (updated after every ship) |
| `docs/handoff/PROJECT.md` | Folders, stack, build |
| `docs/handoff/HOW-WE-WORK.md` | Roles and flow |
| `docs/handoff/USER-PREFERENCES.md` | Isaac's working style |
| `docs/handoff/SUPABASE.md` | SQL scripts index |
| `FTC_WORKFLOW.md` | Builder / Reviewer / QA process |

---

## What I need now

[Isaac: type your task here]
