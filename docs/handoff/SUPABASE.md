# Supabase SQL

Isaac runs these manually in **Supabase SQL Editor**. Cursor creates/updates files in `scripts/` but does not run them.

## When something breaks

| Error / feature | Script |
|-----------------|--------|
| Events table missing | `scripts/setupEvents.sql` |
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

## Rough setup order (fresh project)

1. `setupAuthUsers.sql` / `setupUserProfiles.sql` / onboarding scripts as needed
2. `setupEvents.sql`
3. `setupBookingRequests.sql`
4. `setupProductionRls.sql`
5. Feature scripts as you enable features (DM, notifications, group chat, covers, fallback colour, etc.)

## After running SQL

- Cursor app may need `notify pgrst, 'reload schema';` (included in scripts)
- Re-test the feature in the app

## When Isaac asks for SQL

Cursor should paste the **entire file** from `scripts/` — raw text only.
