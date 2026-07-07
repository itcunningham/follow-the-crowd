# Secrets and credentials — Follow The Crowd

Where sensitive values live. **Never commit real secrets to git, paste them in chat, or store them in the repo.**

---

## Quick rule

| Store here | What |
|------------|------|
| **Password manager** | Vercel recovery codes, Supabase database password, personal backup codes |
| **Vercel → Project → Settings → Environment Variables** | Production + preview app env vars |
| **`.env.local` (local only, gitignored)** | Your machine’s copy for `npm run dev` |
| **Supabase Dashboard** | Project URL, anon key, service role key, DB password, Auth settings |
| **Google Cloud Console** | Maps / Places API keys (with referrer restrictions) |
| **OpenAI dashboard** | API keys for event-plan generation |

This repo may contain **`.env.example`** with empty placeholders only.

---

## App environment variables

Copy `.env.example` → `.env.local` locally. Set the same names in Vercel for deployed builds.

| Variable | Scope | Used for |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | Supabase client; security is RLS, not key secrecy |
| `OPENAI_API_KEY` | **Server only** | `app/api/generate-event` (authenticated) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public (browser) | `VenueMap` — restrict by HTTP referrer in Google Cloud |
| `GOOGLE_PLACES_API_KEY` | Local script only | `scripts/buildVenueDatabase.ts` (optional; not required for app runtime) |

**Not used in app code:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Keep it out of Vercel env unless you have a specific server need. If stored locally for one-off scripts, never commit it.

---

## Platform accounts (not in repo)

### Vercel

- Hosts production/preview deployments for FTC.
- **Recovery codes:** save in your password manager only. They are a full backup into the Vercel account (deployments, env vars, domains).
- **Env vars:** Vercel → FTC project → Settings → Environment Variables. Match `.env.example` names.

### Supabase

- Postgres, Auth, Storage, Realtime.
- **Dashboard → Project Settings → API:** URL, anon key, service role key.
- **Database password:** Dashboard → Database. Needed for direct SQL/psql; not stored in this repo.
- **SQL scripts:** run manually from `scripts/` (see `SUPABASE.md`). Agents do not run destructive SQL without explicit approval.

### GitHub

- Source repo (`follow-the-crowd`). No deployment secrets should live in the repo.

### Google Cloud

- Maps/Places keys. Restrict browser keys to your Vercel domain(s).

### OpenAI

- Billing tied to `OPENAI_API_KEY`. Server-only in Vercel.

---

## What must never go in git

- `.env.local`, `.env.production`, or any file with filled-in values
- Vercel recovery codes or account passwords
- Supabase service role key, database password, or JWT secret
- OpenAI or Google API keys
- Real user IDs, emails, or test passwords in committed SQL

`.gitignore` already ignores `.env*`. Do not force-add env files.

---

## Onboarding checklist (new machine)

1. Clone repo.
2. `cp .env.example .env.local`
3. Fill values from **Vercel** (or Supabase dashboard for URL/anon key).
4. Add `OPENAI_API_KEY` if testing event-plan generation locally.
5. Run `npm run dev` — do not commit `.env.local`.

---

## If a secret leaks

1. Rotate in the provider (Supabase, OpenAI, Google, Vercel) immediately.
2. Update Vercel env vars and local `.env.local`.
3. Redeploy if production was affected.

---

## Related docs

- `.env.example` — variable names and short comments
- `SECURITY_AUDIT.md` — RLS and production security notes
- `SUPABASE.md` — SQL script run order
