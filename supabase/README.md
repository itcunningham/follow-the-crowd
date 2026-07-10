# Supabase migrations

Versioned database changes for Follow The Crowd live in `supabase/migrations/`.

Apply them to production **before** deploying app code that depends on them.

## Apply migrations (recommended)

This repo is **not** configured for Supabase CLI. Apply each migration file once in the **Supabase SQL Editor**, in timestamp order, before deploying dependent app code.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your FTC project → **SQL Editor**
2. Paste the full migration file from `supabase/migrations/`
3. Run once and confirm success

For the History hide feature, run both:

- `20250710120000_event_history_hide.sql`
- `20250710130000_booking_request_history_hides.sql`

## Optional: Supabase CLI

If you later add CLI config to this repo, you can use `supabase db push` instead. Until then, SQL Editor is the supported path.

Migrations are idempotent where possible (`if not exists`, `create or replace`) and safe to re-run if a step was already applied.

## Deploy order

1. Merge migrations to `main`
2. Paste and run pending migrations in Supabase SQL Editor (timestamp order)
3. Deploy the Next.js app

## Legacy `scripts/*.sql`

Older setup scripts remain for bootstrapping and one-off fixes. New feature schema should be added as timestamped files under `supabase/migrations/`.
