# FTC Beta Environment Reset

**Recommended:** run the reusable QA reset utility, then paste the SQL into Supabase.

```bash
npm run qa:reset              # runbook + scope summary
npm run qa:reset:check        # validate SQL structure only
npm run qa:reset -- --print-sql   # print SQL to stdout (pipe to clipboard)
```

**One process in Supabase:** paste `scripts/resetQaEnvironment.sql` into Supabase SQL Editor and run it.

This script removes **QA account data only**. Non-QA users (e.g. real beta testers) and their data are **not** touched.

---

## Step 1 — Open Supabase SQL Editor

Dashboard → **SQL** → **New query**.

## Step 2 — Paste and run

Copy the full contents of **`scripts/resetQaEnvironment.sql`**, paste into the editor, click **Run**.

No edits required.

## Step 3 — Check the output

- **QA data remaining** → all counts **0**
- **Non-QA data preserved** → informational counts (unchanged by this script)
- **QA accounts** → your permanent accounts listed
- **Missing accounts** → empty, or sign up in the app and re-run

## Step 4 — Sign in and test

Log in as QA accounts. Events, Gigs, Calendar, and Messages should show clean empty states with no console errors.

---

## Before first reset (one-time setup)

Sign up QA accounts in the **app** (not via SQL). Use display names `FTC QA Planner`, `FTC QA DJ`, etc., **or** emails like `ftc.qa.planner@yourdomain.com`.

| Account | Display name | Role |
|---------|--------------|------|
| Planner | FTC QA Planner | Promoter |
| DJ (E2E) | FTC QA DJ | DJ |
| DJ 1–3 | FTC QA DJ 1 / 2 / 3 | DJ |
| Dual-role | FTC QA Both | Both |

---

## What gets removed (QA only)

| QA-owned / QA-touching | Left intact |
|------------------------|-------------|
| Events and plans owned by QA users | Non-QA events, plans, bookings |
| QA↔QA bookings; bookings on QA events | Bookings between QA and non-QA users |
| QA-only DM threads (all members QA) | Mixed DMs — only QA messages removed |
| QA-authored crew/group chat messages | Non-QA crew chat messages on shared events |
| QA notifications, calendar, blocks | Non-QA notifications and data |
| QA event covers and DM attachments | Non-QA storage files and avatars |

**Mixed DM example:** If a QA account messaged a real beta tester, the beta tester's messages and thread remain; only the QA user's messages and inbox membership are cleared.

---

## Why auth signup cannot be in the SQL script

Supabase Auth owns passwords and email confirmation. SQL cannot create login credentials safely. **Unavoidable** — sign up in the app once; the reset script only clears QA data.
