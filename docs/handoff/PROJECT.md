# Project quick reference

## Repo

- **Name:** eventos (Follow The Crowd)
- **Branch:** usually `main`
- **Remote:** GitHub (follow-the-crowd)

## Stack

- Next.js 16 App Router (`app/`)
- Supabase (Postgres, Auth, Storage, Realtime)
- Tailwind + custom FTC classes in `app/globals.css`
- TypeScript

## Key folders

| Path | What |
|------|------|
| `app/` | Pages and UI components |
| `lib/` | Data access, business logic |
| `scripts/*.sql` | Legacy Supabase bootstrap / one-off fixes (run manually) |
| `supabase/migrations/` | Versioned database migrations (paste in Supabase SQL Editor) |
| `docs/handoff/` | Session context for new chats |

## Important lib files

- `lib/events.ts` — events CRUD
- `lib/bookingRequests.ts` — booking DMs
- `lib/groupChats.ts` — group chat inbox
- `lib/eventCrewChat.ts` — event group chat messages
- `lib/messageReads.ts` — unread state
- `lib/events/eventFallbackColour.ts` — artwork tile colours
- `lib/events/eventGroupChatUpdate.ts` — edit → group chat update message

## Important UI

- `app/components/events/EventArtworkTile.tsx` — flyer or fallback tile everywhere
- `app/components/events/EventFallbackColourField.tsx` — 8 colours + Auto
- `app/dm/page.tsx` — Messages inbox (DM + Group tabs)
- `app/events/[eventId]/chat/page.tsx` — event group chat

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
