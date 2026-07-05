# Current state (last updated: 2026-07-05)

Update this file after major features ship.

## Core product

- Auth, signup, onboarding, roles (promoter / dj / both)
- Discover, profiles, DM conversations
- Booking requests via DM (pending / accepted / declined / cancelled)
- Events: create, edit, cancel, delete, lineup, send bookings
- Booking plans, calendar, notifications, settings, account deletion

## Events

- Optional event flyer upload (JPEG/PNG/WebP, 5 MB, bucket `event-covers`)
- Portrait-friendly flyer display (not forced 16:9 crop)
- Event colour: 8 selectable + Auto (slate neutral when Auto or legacy slate)
- Flat solid artwork tiles (no glow)
- Event list: whole card links to detail (no Open Event button)
- Edit with confirmation when booking-impacting fields change + group chat update message
- Run sheet is the single planner view for assigned DJs (avatar, name, stage, set time, notes)
- Run sheet rows are created automatically when a DJ accepts; no manual add/delete rows
- Event detail no longer has a separate Lineup section (run sheet replaces it for crew)
- Booking cards in DMs show **live** event fields from `events` table when `event_id` set

## Group chat

- Per-event crew chat for owner + accepted DJs
- Messages inbox Group tab with artwork tile, deduped by event_id
- Event edit posts one update message to group chat (booking-impacting fields)
- Planner does not get unread from own group messages
- Group chat page: header only (duplicate context card removed)

## SQL Isaac may still need to run

See `SUPABASE.md`. If a feature fails with missing column/table, run the matching script.

## Recent commits (reference)

- Unify lineup into run sheet
- Flat event artwork colours
- Remove duplicate group chat event card
- Deduplicate group chat inbox rows
- Prevent own group updates from unread count
- Refresh event details in booking cards
- Post event change updates to group chat
- Add event detail edit action
- Improve event navigation and edit confirmations
- Add event colour fallback tiles
- Support portrait event flyer artwork
