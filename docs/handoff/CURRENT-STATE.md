# Current state (last updated: 2026-07-14)

Update this file after every completed ship (see `HANDOFF-UPDATE.md`).

## Core product

- Auth, signup, onboarding, roles (promoter / dj / both)
- Discover, profiles, DM conversations
- Booking requests via DM (pending / accepted / declined / cancelled)
- Rate proposals: open offers, fixed offers, DJ counter-proposals, accept/decline RPCs
- Events: create, edit, cancel, delete, lineup, send bookings, run sheet
- Event Plans (`/booking-plans`), Calendar (`/calendar`), Gigs (`/bookings`)
- Notifications, settings, account deletion
- DJ availability calendar

## Events

- Optional event flyer upload (JPEG/PNG/WebP, 5 MB, bucket `event-covers`)
- Portrait-friendly flyer display (not forced 16:9 crop)
- Event colour: 8 selectable + Auto (slate neutral when Auto or legacy slate)
- Flat solid artwork tiles (no glow)
- Event list: Active + History tabs; whole card links to detail
- **History hide:** bulk remove from History view (does not delete records)
- **Create/edit validation:** inline field errors after Save; start + finish time both required; notes length/line limits disable save
- **Notes** section on event detail (heading "Notes", muted section label)
- Edit with confirmation when booking-impacting fields change + group chat update message
- Run sheet: single planner view for assigned DJs; table on `lg+`, cards below
- Run sheet rows auto-created when DJ accepts
- Accepted bookings cancellable by planner or DJ with reason + group chat update
- Booking cards in DMs show **live** event fields from `events` when `event_id` set

## Calendar

- Mobile: date strip + selected-day agenda
- Desktop: month grid + day modal (wider layout, same behaviour)
- No intro/description copy under the page title (planner event calendar)
- **Status dot priority per date:** Accepted (green) → Pending (amber) → Upcoming (dark blue); Today uses tile outline, not dot colour
- **Cancelled events hidden** from calendar items, dots, and counts (History unchanged)
- Agenda/grid ordering: booking priority then start time (`sortPlannerCalendarAgendaItems`)
- Event cards: `Event Name · Venue Name` on one truncated line; coloured event accent bar
- **Shared mobile chrome:** `CalendarMobileChrome` owns month nav, legend row, and day-strip spacing for Events and Gigs calendars (standalone + dual-mode); only legend content and optional secondary controls differ
- Create-from-calendar: Save event + **Confirm N DJ(s)** invite flow
- Today highlight on date strip; selected + today states on desktop grid cells

## DJ availability calendar

- Mobile (`< md`): horizontal date strip + selected-day panel — status buttons (Available / Maybe / Unavailable / Clear), booking list, today/selected chip styling aligned with planner event calendar strip
- Desktop (`md+`): month grid with per-date overflow menu unchanged
- Bulk select + quick select (Fridays / Saturdays / weekends) on all breakpoints; mobile strip toggles selection in bulk mode
- **Legend + strip dots:** compact dot-and-label legend (shared `CalendarDotLegend`) — Available light blue, Maybe amber, Unavailable red, Pending Request dark blue, Booked green; date-strip dots use the same mapping with `+N` for multiple markers
- **Past dates:** availability controls hidden (mobile panel + desktop cell menu); empty booking message and mobile helper text suppressed; historical availability badges and booking cards remain visible
- Shared strip component: `PlannerCalendarMobileDateStrip` accepts optional `getDateMarker` for DJ markers (`getDjAvailabilityDateStripMarker`)

## Booking / invite UX

- Default send button label mode: **Confirm N DJ(s)** (`SendBookingRequestsPanel`)
- Unavailable-DJ confirm modal uses Confirm wording
- Calendar-origin and standard create flows aligned on copy and validation

## Event Plans

- **Mobile cards (2026-07-14):** compact layout below `sm` — title + vertically centred Use plan on one row; inline `Event` / `Venue` labels with `text-ftc-text-secondary` values and `text-ftc-text-muted` separator on one truncated line; NOTES label only when notes exist; tighter card padding and list spacing; desktop grid unchanged

## Group chat

- Per-event crew chat for owner + accepted DJs
- Messages inbox Group tab with artwork tile, deduped by event_id
- Event edit posts one update message to group chat (booking-impacting fields)
- Planner does not get unread from own group messages
- Group chat page: header only (duplicate context card removed)

## Copy / UX polish (2026-07)

- "Create event" sentence case (not "Create Event")
- No trailing periods on several confirmation dialogs and empty states
- Desktop planner UX brought into parity with mobile (wording, validation, calendar cards, today/selected styling) without copying mobile layout

## Desktop workspace & performance (2026-07-12)

- **Shared planner shell:** `PlannerWorkspacePage` in `app/components/planner/PlannerWorkspaceLayout.tsx` — Events, Event Plans, Calendar, Gigs share title row (heading derived from active workspace href via `resolvePlannerWorkspaceTitle`), primary tabs, divider, secondary controls baseline on desktop (`md:max-w-5xl`)
- **Desktop consistency tokens:** shared primary surface (`PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS`), list spacing (`PLANNER_WORKSPACE_LIST_CLASS`), title-row baseline alignment; Calendar reference shell — no duplicate in-card titles on desktop; loading skeletons match loaded layout
- **Calendar day selection:** desktop grid highlight tied to open day panel (`actionDate`); closing the panel clears the outline instantly (no transition fade) and blurs focus; Today styling unchanged
- **Page load speed:** optimistic auth in `OnboardingGuard` (cached session renders immediately); profile + nav role persisted to localStorage (userId-scoped) and seeded at module load; profile fetch starts immediately when session exists; auth guard runs profile fetch in parallel with session check; events list + group inbox caches survive hard refresh via localStorage; profile cache + deduped fetches in `lib/user/currentUser.ts`; nav skips redundant profile load when guard profile exists
- Desktop nav width aligned to page shell (`md:max-w-5xl`); `scrollbar-gutter: stable` on `<html>`
- **Navigation badges:** shared `NavBadgeProvider` with session/memory/localStorage cache — Gigs uses `ftc-gigs-pending-count` + runtime store; Messages uses matching `ftc-messages-unread-count` + runtime store (same sync-first pattern as Gigs sub-nav); both seeded at module load; main nav Messages badge reads cache via `getCachedNavMessagesCount` + `useSyncExternalStore`
- **Messages & Profile desktop:** Messages inbox uses `APP_DM_CONTENT_WIDTH_CLASS`; **Profile** uses matching `AppProfilePageShell` with single-column mobile flow (identity → social → cards), centred at `lg:max-w-[52rem]`
- **DM conversation desktop:** chat column `52rem` (~832px) at `lg+`, centered; mobile/tablet unchanged at `max-w-2xl`

## SQL / migrations Isaac may still need to run

See `SUPABASE.md` and `supabase/README.md`. Apply `supabase/migrations/` before deploying features that depend on them.

| Feature | Script / migration |
|---------|-------------------|
| Event history hide | `supabase/migrations/20250710120000_event_history_hide.sql` |
| Gig history hide (per-user) | `supabase/migrations/20250710130000_booking_request_history_hides.sql` |
| Planner Archived tab | `scripts/setupBookingRequestArchiving.sql` (sender `archived_at`) |
| Rate proposals | `scripts/setupBookingRateProposal.sql` |
| Booking cancellation | `scripts/setupBookingCancellation.sql` |

## Recent commits (reference)

- `66bd723` — align Events Calendar mobile layout with Gigs Calendar
- `c32839c` — compact mobile Event Plan cards
- `744360c` — hide DJ availability controls on past dates
- `e8c6dc8` — align DJ calendar legend and strip dots with event calendar style
- `c2f7665` — DJ availability mobile date strip + selected-day controls
- `86eb697` — update handoff docs and agent workflow rules
- `93de0c2` — match planner heading to active workspace
- `0444eac` — speed up authenticated app cold start
- `9d1a5c7` — fix messages badge sync hydration like gigs tab
- `fbd1bbb` — fix messages badge first load timing
- `913efc4` — fix gigs badge hydration timing
- `78a2b5b` — remove calendar intro copy
- `d961180` — polish desktop planner workspace consistency
- `1943163` — speed up page loads (optimistic auth + profile caching)
- `daf08a2` — fix desktop workspace alignment drift
- `8e324f7` — desktop/mobile planner UX parity
