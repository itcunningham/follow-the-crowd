# FTC Beta Environment Reset

One checklist to return Supabase to a **fresh-install state** for permanent QA accounts before official beta testing.

**Script:** `scripts/resetQaEnvironment.sql`  
**Automated runner (optional):** `npm run qa:reset-environment -- --confirm`  
**Last updated:** 2026-07-26

---

## What this does

| Action | Detail |
|--------|--------|
| Removes | Events, event plans, bookings, gig history hides, DMs, crew chat, notifications, calendar availability, blocks, run sheets |
| Clears storage | `dm-attachments`, `event-covers` (orphaned flyers and DM files) |
| Preserves | Auth users, profile avatars (`profile-images`), roles, RLS, app logic |
| Seeds | Realistic default profiles for FTC QA Planner, DJ, DJ 1–3, and Both |

---

## Step 1 — Confirm backup

In Supabase Dashboard → **Database → Backups**, confirm a recent backup exists (or take one manually) before wiping data.

---

## Step 2 — Ensure QA auth accounts exist

Sign up each account through the **production app** (or Supabase Auth dashboard). **Do not** insert rows into `auth.users` via SQL.

| Display name | Typical email source | Role |
|--------------|---------------------|------|
| FTC QA Planner | `FTC_QA_PLANNER_EMAIL` in `.env.qa.local` | Promoter |
| FTC QA DJ | `FTC_QA_DJ_EMAIL` | DJ (E2E default) |
| FTC QA DJ 1 | `ftc.qa.dj1@…` (optional) | DJ |
| FTC QA DJ 2 | `ftc.qa.dj2@…` (optional) | DJ |
| FTC QA DJ 3 | `ftc.qa.dj3@…` (optional) | DJ |
| FTC QA Both | `FTC_QA_BOTH_EMAIL` | Both |

Complete onboarding once so each account has a `public.users` row (or note emails for Step 3).

---

## Step 3 — Map auth emails (first run only)

Open `scripts/resetQaEnvironment.sql` → **Part 0** (`_qa_email_map`).

Paste emails from `.env.qa.local` into the empty strings:

```sql
('FTC QA Planner', 'your-planner@email'),
('FTC QA DJ', 'your-dj@email'),
...
```

Skip this if profiles already use the exact FTC QA display names from onboarding.

---

## Step 4 — Run the reset script

**Recommended — Supabase SQL Editor**

1. Open Supabase Dashboard → **SQL Editor** → New query.
2. Paste the full contents of `scripts/resetQaEnvironment.sql`.
3. Click **Run**.

**Optional — local automated runner**

Requires a non-empty `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and `.env.qa.local` for email auto-mapping.

```bash
npm run qa:reset-environment -- --confirm
```

---

## Step 5 — Verify script output

Confirm these result sets:

1. **Transactional counts** — all `row_count` values are **0** (including `storage:dm-attachments` and `storage:event-covers`).
2. **Integrity checks** — orphan counts are **0**.
3. **QA accounts** — each permanent account appears with `onboarding_complete = true`.
4. **Missing accounts** — empty, or follow the `action` column (sign up + re-run).

---

## Step 6 — Smoke-test in the app

Sign in as each QA account and confirm empty states with **no console errors**:

- **Planner:** Events, Event Plans, Gigs, Calendar
- **Each DJ:** Gigs, Calendar, Messages
- **Both:** planner and DJ workspaces

---

## Step 7 — Mark OP-10 complete

Update [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md) OP-10 once verified.

---

## Manual steps only (cannot be automated safely)

| Step | Why |
|------|-----|
| **Auth signup** | Supabase Auth must create credentials; SQL cannot safely set passwords or bypass email confirmation policies. |
| **Email map (Part 0)** | One-time paste from `.env.qa.local` unless using the npm runner with env files configured. |
| **Service role key** | Bypasses RLS — must never ship to Vercel; Isaac keeps it in local `.env.local` only. |
| **Profile avatars** | Preserved intentionally in `profile-images`; delete manually in Storage if you need avatar wipe too. |

---

## Re-seed profiles only (no data wipe)

After creating a new auth account, run `scripts/seedQaProfiles.sql` (fill Part 0 emails first).

---

## Related

- [QA-BETA-ENVIRONMENT-RESET.md](./QA-BETA-ENVIRONMENT-RESET.md) — technical reference (superseded by this runbook)
- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md) — OP-10 gate
- `.env.qa.local.example` — credential template (never commit `.env.qa.local`)
