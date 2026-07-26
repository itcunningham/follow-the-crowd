# QA beta environment reset

Prepare a **clean slate** for official FTC beta readiness testing by removing transactional QA data while preserving permanent QA accounts, auth, profiles, and RLS.

**Last updated:** 2026-07-26

---

## What gets removed

All rows from:

| Area | Tables |
|------|--------|
| Events & plans | `events`, `booking_plans`, `event_run_sheet_columns`, `event_run_sheet_rows` |
| Bookings & gigs | `booking_requests`, `booking_request_history_hides` |
| Messaging | `conversations`, `conversation_members`, `messages`, `message_reads`, `message_attachments`, `message_reactions`, `user_reports` |
| Notifications | `notifications` |
| Calendar | `dj_availability` |
| DM safety | `user_blocks` |

## What is preserved

- `auth.users` and `public.users` (profiles, avatars, roles, onboarding)
- RLS policies and RPC functions
- Storage buckets (orphaned files in `dm-attachments` / `event-covers` may remain — remove manually if needed)

## Permanent QA accounts

These display names must remain after reset:

- **FTC QA Planner**
- **FTC QA DJ** (E2E default DJ account)
- **FTC QA DJ 1**, **FTC QA DJ 2**, **FTC QA DJ 3** (create in Supabase Auth if not present)
- **FTC QA Both** (optional dual-role account)

Credentials live in git-ignored `.env.qa.local` — never commit.

---

## How to run

### Option A — Local script (recommended when service role is in `.env.local`)

```bash
# Dry run (lists tables only)
npm run qa:reset-environment

# Execute cleanup
npm run qa:reset-environment -- --confirm
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

### Option B — Supabase SQL Editor

1. Confirm a Supabase backup exists.
2. Paste and run `scripts/cleanupTestData.sql`.
3. Verify post-cleanup counts are **0** and QA account rows are listed.

---

## Post-reset verification

1. Sign in as **FTC QA Planner** — Events, Event Plans, Gigs, Calendar load with empty states (no errors).
2. Sign in as each **FTC QA DJ** account — Gigs, Calendar, DMs load normally.
3. Confirm **FTC QA Both** if used for dual-role flows.
4. Browser console: no errors on core routes.
5. Optional: run `npm run qa:e2e:prod` after reset if production E2E credentials are configured.

---

## Related docs

- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md) — OP-10 QA data cleanup
- [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md) — go-live operational gates
- [AUTHENTICATED-E2E.md](./AUTHENTICATED-E2E.md) — `QA-BETA-*` naming in automated tests
