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

- **QA data remaining** → all counts **0** (except `qa_booking_requests_mixed_remaining` — see below)
- **QA data cleared this run** → row counts and age range of what was just deleted. A range spanning hours or days is normal — it's QA testing activity accumulated since your last run, not evidence anything survived.
- **Reset run history** → your last 10 runs with the gap between each. If it's been a while since your last run, expect a wider "QA data cleared this run" range above.
- **QA mixed bookings remaining** → **0** when QA only tested with other QA accounts; may be **> 0** if a QA account booked a real beta tester (those rows are preserved intentionally)
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

## Edge cases (read before Beta Readiness)

| Scenario | Reset behaviour |
|----------|-----------------|
| QA↔non-QA booking | Booking row **preserved** — QA Gigs/Calendar may still show it until manually archived or the beta tester cancels |
| Mixed DM thread | Non-QA messages and read state **preserved**; only QA messages and QA membership removed |
| Non-QA notification linking to deleted QA-only DM/event | **Removed** (stale inbox link) |
| Non-QA notification about a preserved QA↔non-QA booking | **Preserved** |
| QA account with email/display name outside detection rules | **Not touched** — rename to match rules or add manually |
| Re-run in same SQL Editor session | Safe — temp tables dropped at start |

---

## "I ran the reset but chats/bookings are still there" (investigated 2026-08-01)

This almost always means new QA activity was created **after** your last reset
run, not that the reset failed. Confirmed by tracing real data end-to-end
(detection, scoping, FK constraints, and live rows) with no defect found — the
deletion logic already covers QA-only conversations and QA↔QA bookings
correctly; a global check of the oldest surviving row lined up exactly with
the timestamp of the previous successful run.

The script now makes this self-diagnosing instead of something you have to
take on faith:

- `public.qa_reset_log` — a small permanent table (not a temp table, so it
  survives across SQL Editor sessions) that records a timestamp every time
  the script runs.
- **"QA data cleared this run"** verification block — reports the row count
  and age range (oldest/newest `created_at`) of everything the script is
  about to delete, captured before the delete runs.
- **"Reset run history"** verification block — your last 10 runs with the
  time gap since the previous one.

If you see a multi-day age range in "QA data cleared this run," that's normal
QA testing accumulated since your last run — not a bug. Run the reset again
whenever you want a clean slate; there's no need to run it after every test.

## Storage cleanup requires a session setting (fixed 2026-08-01)

Supabase blocks a raw SQL `DELETE` on `storage.objects` unless
`storage.allow_delete_query` is set to `true` for the session. The script now
sets this as a **local (transaction-scoped)** setting immediately before the
two storage deletes, inside the same `begin; … commit;` block, so it only
applies to those statements. Without it, the event-cover and DM-attachment
storage deletes silently affected 0 rows — the DB rows were still cleared,
but orphaned files remained in the buckets. No runbook steps changed; this
only makes the storage cleanup in Step 2 actually take effect.

---

## Why auth signup cannot be in the SQL script

Supabase Auth owns passwords and email confirmation. SQL cannot create login credentials safely. **Unavoidable** — sign up in the app once; the reset script only clears QA data.
