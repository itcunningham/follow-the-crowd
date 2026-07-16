# Release Checklist

Steps before and during FTC coached private beta releases.

**Status:** Not Started · In Progress · Passed · Failed · Blocked  
**Go-live record:** [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md)

---

## Pre-release (1–2 days before)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| REL-01 | Confirm all intended changes merged to `main` | Passed | Builder | At coached beta GO |
| REL-02 | `npm run build` passes on latest `main` | Passed | Builder | Confirmed at GO |
| REL-03 | Handoff docs updated (`docs/handoff/CURRENT-STATE.md`) | Passed | Builder | 2026-07-16 |
| REL-04 | New Supabase SQL identified and documented | Passed | Builder | See `docs/handoff/SUPABASE.md` |
| REL-05 | Isaac runs any new migrations in Supabase SQL Editor | Passed | Isaac | Applied before GO |
| REL-06 | [TEST-PLAN.md](./TEST-PLAN.md) critical paths **Passed** | Passed | QA | Automated 8/8 + manual iPhone 7/7 |
| REL-07 | [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md) **Passed** on production | Passed | QA | At GO |
| REL-08 | Zero open **Critical** bugs | Passed | QA / Isaac | |
| REL-09 | **High** bugs reviewed — fix or accept risk | Passed | Isaac | Zero High at GO |
| REL-10 | Beta tester accounts provisioned | Not Started | Isaac | Before first coached invite |

---

## Release day (coached beta GO — 2026-07-16)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| REL-20 | Production deploy stable on `main` | Passed | Builder | Confirmed at GO |
| REL-21 | Verify Vercel deploy succeeded | Passed | Isaac / Builder | Stable |
| REL-22 | Smoke test production: login | Passed | QA | |
| REL-23 | Smoke test production: send DM | Passed | QA | |
| REL-24 | Smoke test production: events list | Passed | QA | |
| REL-25 | No console errors on first load (mobile) | Passed | QA | iPhone Safari 7/7 |
| REL-26 | Notify beta testers of release | Not Started | Isaac | After OP checklist complete |

---

## Pre-invite operational checklist

Complete before the **first coached tester invite** (see [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md)):

| # | Task | Status | Owner |
|---|------|--------|-------|
| OP-01 | Tester list approved (5–10 Planner/DJ pairs) | Not Started | Isaac |
| OP-02 | Controlled signup/invitation approach confirmed | Not Started | Isaac |
| OP-03 | Feedback channel ready | Not Started | Isaac |
| OP-04 | Bug-report instructions ready | Not Started | Isaac |
| OP-05 | Support contact ready | Not Started | Isaac |
| OP-06 | Known limitations shared ([KNOWN-ISSUES.md](./KNOWN-ISSUES.md)) | Not Started | Isaac |
| OP-07 | Supabase backup confirmed | Not Started | Isaac |
| OP-08 | Rollback procedure confirmed | Not Started | Isaac |
| OP-09 | Vercel/Supabase monitoring available | Not Started | Isaac |
| OP-10 | `QA-BETA-*` data safely cleaned or isolated | Not Started | Isaac |
| OP-11 | Test credentials local/Git-ignored (no `.env.qa.local` in repo) | Not Started | Isaac |

**Pause rule:** New **Critical** or **High** production defect → pause tester onboarding until triaged.

---

## Post-release (24–48 hours)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| REL-30 | Monitor for auth or messaging outages | Not Started | Isaac | After first invites |
| REL-31 | Triage incoming bug reports ([BUG-TEMPLATE.md](./BUG-TEMPLATE.md)) | Not Started | QA | |
| REL-32 | Update [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) from tester feedback | Not Started | QA | |
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
| Release name | FTC Coached Private Beta |
| Decision | **GO** |
| Date | 2026-07-16 |
| Commit hash | _See latest `main` at doc commit_ |
| Migrations run | `20250715180000`, `20250715213000` |
| Security audit | 16/16 passed |
| Automated production QA | 8/8 passed |
| iPhone Safari smoke | 7/7 passed |
| QA sign-off | Passed at GO |
| Product Owner sign-off | Isaac — GO |
| Known issues shipped | [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) — KN-01 through KN-06 accepted |

---

## Related

- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md)
- [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md)
- [KNOWN-ISSUES.md](./KNOWN-ISSUES.md)
- [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md)
