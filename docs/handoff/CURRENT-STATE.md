# Current state (last updated: 2026-07-12)

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
- Create-from-calendar: Save event + **Confirm N DJ(s)** invite flow
- Today highlight on date strip; selected + today states on desktop grid cells

## Booking / invite UX

- Default send button label mode: **Confirm N DJ(s)** (`SendBookingRequestsPanel`)
- Unavailable-DJ confirm modal uses Confirm wording
- Calendar-origin and standard create flows aligned on copy and validation

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

- **Shared planner shell:** `PlannerWorkspacePage` in `app/components/planner/PlannerWorkspaceLayout.tsx` — Events, Event Plans, Calendar, Gigs share title row, primary tabs, divider, secondary controls baseline on desktop (`md:max-w-5xl`)
- **Desktop consistency tokens:** shared primary surface (`PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS`), list spacing (`PLANNER_WORKSPACE_LIST_CLASS`), title-row baseline alignment; Calendar reference shell — no duplicate in-card titles on desktop; loading skeletons match loaded layout
- **Calendar day selection:** desktop grid highlight tied to open day panel (`actionDate`); closing the panel clears the outline instantly (no transition fade) and blurs focus; Today styling unchanged
- **Page load speed:** optimistic auth in `OnboardingGuard` (cached session renders immediately); profile cache + deduped fetches in `lib/user/currentUser.ts`; nav skips redundant profile load when guard profile exists
- Desktop nav width aligned to page shell (`md:max-w-5xl`); `scrollbar-gutter: stable` on `<html>`
- **Navigation badges:** shared `NavBadgeProvider` with session/memory cache — Messages and Gigs counts hydrate immediately on tab switches; invisible badge slot reserved on first load until counts arrive
- **Messages & Profile desktop:** shared `AppPageLayout` shell (`md:max-w-5xl`) aligned with Events workspace; inbox desktop card surface; profile two-column desktop grid

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

- `8a24031` — Stabilise navigation notification badges
- `78a2b5b` — Remove calendar intro copy
- `d98f218` — Fix calendar day highlight clearing on panel close
- `d961180` — Polish desktop planner workspace consistency
- `1943163` — Speed up page loads (optimistic auth + profile caching)
- `daf08a2` — Fix desktop workspace alignment drift (shared shell)
- `feb2eba` — Align desktop events workspace layouts
- `2e0648c` — Update ChatGPT and handoff docs
- `8e324f7` — Desktop/mobile planner UX parity
- `3f1ce61` — Venue on calendar event cards
- `41787b5` — Calendar date-strip dot priority
- `12b3ffa` — Inline event form validation
