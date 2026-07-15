# Release Checklist

Steps before and during an FTC beta production release. For QA Reviewers and Isaac.

**Status:** Not Started · In Progress · Passed · Failed · Blocked

---

## Pre-release (1–2 days before)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| REL-01 | Confirm all intended changes merged to `main` | Not Started | Builder | |
| REL-02 | `npm run build` passes on latest `main` | Not Started | Builder | |
| REL-03 | Handoff docs updated (`docs/handoff/CURRENT-STATE.md`) | Not Started | Builder | |
| REL-04 | New Supabase SQL identified and documented | Not Started | Builder | See `docs/handoff/SUPABASE.md` |
| REL-05 | Isaac runs any new migrations in Supabase SQL Editor | Not Started | Isaac | Before or immediately after deploy |
| REL-06 | [TEST-PLAN.md](./TEST-PLAN.md) critical paths **Passed** | Not Started | QA | |
| REL-07 | [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md) **Passed** on staging/preview or production | Not Started | QA | |
| REL-08 | Zero open **Critical** bugs | Not Started | QA / Isaac | |
| REL-09 | **High** bugs reviewed — fix or accept risk | Not Started | Isaac | |
| REL-10 | Beta tester accounts provisioned | Not Started | Isaac | |

---

## Release day

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| REL-20 | Push to `main` (auto-deploys Vercel production) | Not Started | Builder | |
| REL-21 | Verify Vercel deploy succeeded | Not Started | Isaac / Builder | |
| REL-22 | Smoke test production: login | Not Started | QA | R-01 |
| REL-23 | Smoke test production: send DM | Not Started | QA | R-06 |
| REL-24 | Smoke test production: events list | Not Started | QA | R-03 |
| REL-25 | Confirm no console errors on first load (mobile 390px) | Not Started | QA | |
| REL-26 | Notify beta testers of release | Not Started | Isaac | |

---

## Post-release (24–48 hours)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| REL-30 | Monitor for auth or messaging outages | Not Started | Isaac | |
| REL-31 | Triage incoming bug reports ([BUG-TEMPLATE.md](./BUG-TEMPLATE.md)) | Not Started | QA | |
| REL-32 | Update [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md) open defects | Not Started | QA | |
| REL-33 | Hotfix process agreed if Critical found | Not Started | Isaac | Builder only; one writer rule |

---

## Rollback criteria

Trigger rollback discussion if any of the following occur in production:

| Condition | Severity |
|-----------|----------|
| Users cannot log in | Critical |
| Messages not sending or not delivering | Critical |
| Data visible to wrong user | Critical |
| Event create completely broken | High |
| Widespread 500 errors on core routes | Critical |

**Rollback owner:** Isaac (revert commit on `main` or Vercel rollback)

---

## Release record

| Field | Value |
|-------|-------|
| Release name | FTC Private Beta |
| Date | |
| Commit hash | |
| Migrations run | |
| QA sign-off | |
| Isaac sign-off | |
| Known issues shipped | |

---

## Related

- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md)
- [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md)
- `FTC_WORKFLOW.md` — Builder / Reviewer / QA roles
