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

## Supabase CLI

The repo has no `supabase/config.toml` and is not linked, so `supabase db push` is not the path for migrations — SQL Editor is. The CLI **is** installed and authenticated though, and it is the only way to deploy Edge Functions (see below).

Migrations are idempotent where possible (`if not exists`, `create or replace`) and safe to re-run if a step was already applied.

## Edge Functions — Vercel does NOT deploy these

`supabase/functions/**` is **not** part of the Vercel build. Merging a change to `main` deploys the Next.js app and nothing else; the Edge Function keeps running whatever was last pushed to Supabase.

This has already cost two full QA rounds: on 2026-08-15 the push deep-link change to `push-send` was merged, reviewed, and marked shipped, but the deployed function stayed on its 2026-08-13 version for a day — so the feature was dead in production while every source-level check said it was fine.

**Any time a file under `supabase/functions/` changes, deploy it explicitly:**

```bash
supabase functions deploy push-send --project-ref gidplxriruttihfirvii --no-verify-jwt
```

`--no-verify-jwt` is required: `push-send` is called by a database webhook that authenticates with its own `x-push-webhook-secret` header, not a Supabase JWT. Deploying without the flag turns on gateway JWT checking and every push silently 401s at the edge before reaching the function.

**Verify what is actually live** — never assume a deploy happened:

```bash
supabase functions list --project-ref gidplxriruttihfirvii
```

To diff the deployed source against the repo, download it into a throwaway directory (`supabase functions download` writes into `./supabase/functions/`, so never run it from the repo root — it will overwrite your working copy):

```bash
cd "$(mktemp -d)" && supabase functions download push-send --project-ref gidplxriruttihfirvii
```

## Deploy order

1. Merge migrations to `main`
2. Paste and run pending migrations in Supabase SQL Editor (timestamp order)
3. **Deploy any changed Edge Functions** (see above) — Vercel will not do this for you
4. Deploy the Next.js app

## Legacy `scripts/*.sql`

Older setup scripts remain for bootstrapping and one-off fixes. New feature schema should be added as timestamped files under `supabase/migrations/`.
