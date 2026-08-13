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

## The 2026-08-08 reset did NOT use this script — read before reaching for it

The clean reset before the two-account beta pass ran off an **explicit list of
four literal user ids**, not the detection rules below. That was not a
preference; the script could not have done the job.

**Why.** Detection (`resetQaEnvironment.sql` lines 91–95) requires a
`FTC QA` display name, an `ftcqa_` username, or an `ftcqa` / `ftc.qa` / `ftc_qa`
email local part. The accounts holding the data were `FTC QABot` and `Synergy`.
Neither matched. Running the script would have reported success and deleted
almost nothing.

**Do not loosen the detection rules to fix this.** They are the only thing
standing between a reset and a real user's data — the regexes at lines 72–77 are
deliberately permissive about *labelling* and the tight gate below them is what
makes that safe. Widening the gate trades a one-time inconvenience for a
permanent hazard.

**Use an explicit scope instead.** The procedure that worked:

1. **Inventory** — read-only, one row per account with counts of events owned,
   bookings, DM threads, messages authored and last activity. This is how you
   identify which accounts actually hold test data.
2. **Pre-flight** — read-only, replicating the deletion rules against an explicit
   `targets(user_id)` list, reporting per-table counts **plus** a
   `NON-QA COLLATERAL` section. That section is the point of the exercise.
3. **Review the collateral, then widen or narrow the target list** and re-run the
   pre-flight until collateral is zero.
4. **Delete** — one transaction, every filter a literal id, no `LIKE` and no
   pattern match anywhere.
5. **Verify** — read-only, asserting the accounts survived *and* their data is
   gone *and* nothing was orphaned.

**The trap this catches.** Two of the deletion rules scope by **event
ownership, not authorship**. A booking or crew message belonging to an account
you never listed is still deleted if it sits on a target-owned event. The first
pre-flight run surfaced 14 bookings, 2 crew messages, 2 read rows and 2
notifications belonging to `Synergy` — an account explicitly excluded at the
time. "Delete only my test accounts' data" and "reset this account's events"
are not the same instruction, and the difference is invisible without that
check.

Storage is not covered by the explicit-scope route. Event covers and DM
attachments remain as orphaned bucket files; see the storage note below.

---

## Step 1 — Open Supabase SQL Editor

Dashboard → **SQL** → **New query**.

## Step 2 — Paste and run

Copy the full contents of **`scripts/resetQaEnvironment.sql`**, paste into the editor, click **Run**.

No edits required.

## Step 3 — Check the output

- **QA chats/messages remaining** → all counts **0**
- **QA bookings remaining** → all counts **0** — this only counts QA↔QA bookings; a booking between a QA account and a real beta tester is preserved intentionally and won't show here (see Edge cases below)
- **QA events/plans remaining** → all counts **0**
- **QA accounts still present** → your permanent accounts listed with profiles intact
- **Non-QA data preserved** → informational counts (unchanged by this script)

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

This almost always means new QA activity was created **after** your last
reset run, not that the reset failed. Confirmed by tracing real data
end-to-end (detection, scoping, FK constraints, and live rows) with no
defect found — the deletion logic already covers QA-only conversations and
QA↔QA bookings correctly. If it still looks wrong after a fresh run, check
whether the data involves a non-QA (real beta tester) account — those rows
are preserved intentionally (see Edge cases above) — before assuming a bug.

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
