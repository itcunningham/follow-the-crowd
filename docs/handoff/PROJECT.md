# Project quick reference

## Repo

- **Product:** Follow The Crowd (FTC)
- **Local path:** `/Users/isaaccunningham/Projects/FTC`
- **Legacy name:** eventos (same repo)
- **GitHub:** `itcunningham/follow-the-crowd`
- **Branch:** `main` → Vercel production deploy on push

## Stack

- Next.js 16 App Router (`app/`)
- Supabase (Postgres, Auth, Storage, Realtime, RPC)
- Tailwind + custom FTC classes in `app/globals.css`
- TypeScript

## Key folders

| Path | What |
|------|------|
| `app/` | Pages and UI components |
| `lib/` | Data access, business logic |
| `scripts/*.sql` | Legacy Supabase bootstrap / one-off fixes (run manually) |
| `supabase/migrations/` | Versioned database migrations (paste in Supabase SQL Editor) |
| `docs/handoff/` | Session context for new chats (Cursor + ChatGPT) |
| `FTC_WORKFLOW.md` | Builder / Reviewer / QA working agreement |

## Planner routes

| Route | Purpose |
|-------|---------|
| `/events` | Event list (Active / History) |
| `/booking-plans` | Saved Event Plans |
| `/calendar` | Planner calendar |
| `/bookings` | Gigs (DJ) + planner booking campaigns |

Sub-nav: `lib/plannerEventsNav.ts`, `app/components/PlannerEventsSubNav.tsx`

## Important lib files

- `lib/events.ts` — events CRUD, history hide, lineup stats
- `lib/bookingRequests.ts` — booking DMs, status, rate proposal RPCs
- `lib/bookingRate.ts` — rate display/helpers
- `lib/calendar.ts` — calendar items, sorting, status dots, headlines
- `lib/bookingDateTime.ts` — date/time parsing, validation
- `lib/events/eventFormFieldValidation.ts` — create/edit inline errors
- `lib/events/eventNotes.ts` — notes length/line limits
- `lib/groupChats.ts` — group chat inbox
- `lib/bookingPlans.ts` — saved event plans
- `lib/ftcFlatStatus.ts` — status badge/dot colour classes

## Important UI

- `app/events/EventsPageClient.tsx` — events list + create flow
- `app/events/[eventId]/page.tsx` — event detail
- `app/components/PlannerCalendar.tsx` — calendar (mobile agenda + desktop grid)
- `app/components/booking/SendBookingRequestsPanel.tsx` — invite DJs UI
- `app/components/BookingRequestCard.tsx` — DM booking cards
- `app/components/events/EventArtworkTile.tsx` — flyer or fallback tile
- `app/dm/page.tsx` — Messages inbox (DM + Group tabs)

## Event artwork

- Flyer: `events.cover_image_url`, bucket `event-covers`
- Fallback colour: `events.fallback_colour` — keys: blue, violet, teal, green, amber, orange, red, pink, slate
- **Selectable in UI:** 8 colours + Auto. Slate = auto/neutral only (not a swatch).
- Flyer always wins over colour tile.

## Build

```bash
npm run dev
npm run build
```
