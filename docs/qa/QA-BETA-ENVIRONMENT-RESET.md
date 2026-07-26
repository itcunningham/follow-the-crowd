# QA beta environment reset

> **Use the step-by-step runbook:** [FTC-BETA-ENVIRONMENT-RESET.md](./FTC-BETA-ENVIRONMENT-RESET.md)

Technical reference for the reset tooling (superseded for day-to-day use by the runbook above).

**Last updated:** 2026-07-26

---

## Canonical script

**`scripts/resetQaEnvironment.sql`** — single SQL file: cleanup, storage wipe, profile seed, verification.

Legacy `scripts/cleanupTestData.sql` redirects here.

---

## Automated runner

```bash
npm run qa:reset-environment -- --confirm
```

Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and optional `.env.qa.local` emails.

---

## Related

- [FTC-BETA-ENVIRONMENT-RESET.md](./FTC-BETA-ENVIRONMENT-RESET.md) — **start here**
- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md)
- [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md)
