# FTC Beta Environment Reset

**One process only:** paste `scripts/resetQaEnvironment.sql` into Supabase SQL Editor and run it.

---

## Step 1 — Open Supabase SQL Editor

Dashboard → **SQL** → **New query**.

## Step 2 — Paste and run

Copy the full contents of **`scripts/resetQaEnvironment.sql`**, paste into the editor, click **Run**.

No edits required. QA accounts are detected automatically by:

- Display name starting with `FTC QA`
- Username starting with `ftcqa_`
- Auth email local-part starting with `ftcqa`, `ftc.qa`, or `ftc_qa`

## Step 3 — Check the output

- **Transactional counts** → all `0`
- **QA accounts** → your permanent accounts listed with `onboarding_complete = true`
- **Missing accounts** → empty (or sign up those accounts in the app, then re-run)

## Step 4 — Sign in and test

Log in as your QA accounts. Events, Gigs, Calendar, and Messages should show clean empty states with no console errors.

---

## Before first reset (one-time setup)

Sign up QA accounts in the **app** (not via SQL). During onboarding, set display names to `FTC QA Planner`, `FTC QA DJ`, etc. — **or** use emails like `ftc.qa.planner@yourdomain.com`.

| Account | Display name | Role |
|---------|--------------|------|
| Planner | FTC QA Planner | Promoter |
| DJ (E2E) | FTC QA DJ | DJ |
| DJ 1–3 | FTC QA DJ 1 / 2 / 3 | DJ |
| Dual-role | FTC QA Both | Both |

Credentials live in git-ignored `.env.qa.local`.

---

## Why auth signup cannot be in the SQL script

Supabase Auth owns passwords, email confirmation, and session tokens. Inserting into `auth.users` from SQL bypasses those safeguards and cannot set login passwords safely. **This is unavoidable** — account creation stays in the app; the reset script only wipes data and normalises profiles for accounts that already exist.

---

## What the script removes vs keeps

| Removed | Kept |
|---------|------|
| Events, plans, bookings, DMs, notifications | Auth users and login |
| Calendar availability, blocks, history hides | Profile avatars (`profile-images`) |
| DM attachments and event cover files | RLS and app configuration |
