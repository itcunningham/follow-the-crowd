# Supabase migrations

Versioned database changes for Follow The Crowd live in `supabase/migrations/`.

Apply them to production **before** deploying app code that depends on them.

## Recommended: Supabase CLI

```bash
# One-time: install CLI and link the project
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# Apply pending migrations to the linked remote database
supabase db push
```

`supabase db push` runs only migrations that have not been applied yet.

## Manual fallback (SQL Editor)

If you are not using the CLI, open the migration file in `supabase/migrations/` and run its full contents once in the Supabase SQL Editor.

Use this only when CLI deploy is unavailable. The migration file in this folder is the source of truth — not duplicate copies under `scripts/`.

## Deploy order

1. Merge migration to `main`
2. Run `supabase db push` (or paste the migration in SQL Editor)
3. Deploy the Next.js app

## Legacy `scripts/*.sql`

Older setup scripts remain for bootstrapping and one-off fixes. New feature schema should be added as timestamped files under `supabase/migrations/`.
