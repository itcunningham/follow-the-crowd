# Supabase migrations

Versioned database changes for Follow The Crowd live in `supabase/migrations/`.

Apply them to production **before** deploying app code that depends on them.

## Apply a migration (recommended)

This repo is **not** configured for Supabase CLI (`supabase/config.toml` is not checked in). Use the SQL Editor:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your FTC project → **SQL Editor**
2. Open the migration file from `supabase/migrations/` in this repo
3. Paste the **entire file** into the editor
4. Run it once
5. Confirm success (the migration ends with `notify pgrst, 'reload schema';`)

Migrations are idempotent where possible (`if not exists`, `create or replace`) and safe to re-run if a step was already applied.

## Deploy order

1. Merge migration to `main`
2. Paste and run the migration in Supabase SQL Editor
3. Deploy the Next.js app

## Optional: Supabase CLI

If you later add CLI config to this repo, you can use `supabase db push` instead. Until then, SQL Editor is the supported path.

## Legacy `scripts/*.sql`

Older setup scripts remain for bootstrapping and one-off fixes. New feature schema should be added as timestamped files under `supabase/migrations/`.
