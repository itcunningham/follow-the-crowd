# FTC Coached Private Beta — Go-Live Record

**Decision:** **GO** — small, coached private beta  
**Date:** 2026-07-16  
**Signed off by:** Product Owner (Isaac)

---

## Evidence summary

| Gate | Result | Notes |
|------|--------|-------|
| Production Supabase security audit | **16/16 passed** | Includes corrected check #12 (`public`/`anon` write) and check #16 (crew-chat auto-start auth) |
| Authenticated automated production QA | **8/8 passed** | Playwright production harness |
| Physical iPhone Safari smoke | **7/7 passed** | Touch nav and core flows |
| Open **Critical** defects | **0** | |
| Open **High** defects | **0** | |
| Production build | **Passed** | `npm run build` |
| Production deployment | **Stable** | No confirmed launch-blocking product defect |

---

## Beta audience and limits

- **5–10 coached Planner/DJ pairs**
- Existing working relationships preferred
- Controlled invitations/access — not broad cold onboarding
- **Not** public launch
- **Out of scope for beta:** payments, AI generation, Discover expansion, social features, or other new product scope

---

## Accepted known issues

See [KNOWN-ISSUES.md](./KNOWN-ISSUES.md). Medium and Low items are accepted for coached beta and monitored through tester feedback. Do not treat them as launch blockers.

---

## Feedback and support (placeholders)

| Item | Status | Value |
|------|--------|-------|
| Feedback channel | **TBD** | _Isaac to confirm before first invite_ |
| Bug-report instructions | **TBD** | Use [BUG-TEMPLATE.md](./BUG-TEMPLATE.md); share channel TBD |
| Support contact | **TBD** | See `NEXT_PUBLIC_SUPPORT_EMAIL` / Isaac contact — confirm before invite |

---

## Operational requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| Supabase backup confirmed | **Not confirmed** | Isaac must confirm before first tester invite |
| Rollback procedure confirmed | **Not confirmed** | Vercel rollback + migration notes in `SUPABASE.md` |
| Vercel/Supabase monitoring available | **Not confirmed** | Confirm dashboards/alerts before invite |
| `QA-BETA-*` data cleaned or isolated | **Not confirmed** | Do not mix tester data with QA seed accounts without plan |
| Test-account credentials local/Git-ignored | **Required** | Never commit `.env.qa.local`, tokens, or Playwright storage states |

---

## Pause rule

**Any new Critical or High production defect pauses tester onboarding** until triaged, fixed or explicitly accepted by Product Owner.

---

## Rollback criteria

Same as [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md): auth broken, messages not delivering, cross-user data exposure, event create completely broken, or widespread 500s on core routes.

---

## Pre-invite operational checklist

Complete before the first coached tester invite:

| # | Item | Confirmed? |
|---|------|------------|
| OP-01 | Tester list approved (5–10 Planner/DJ pairs) | ☐ |
| OP-02 | Controlled signup/invitation approach confirmed | ☐ |
| OP-03 | Feedback channel ready | ☐ |
| OP-04 | Bug-report instructions shared with testers | ☐ |
| OP-05 | Support contact ready | ☐ |
| OP-06 | Known limitations shared with testers | ☐ |
| OP-07 | Supabase backup confirmed | ☐ |
| OP-08 | Rollback procedure confirmed | ☐ |
| OP-09 | Vercel/Supabase monitoring available | ☐ |
| OP-10 | Existing `QA-BETA-*` data safely cleaned or isolated | ☐ |
| OP-11 | Test-account credentials remain local and Git-ignored | ☐ |

---

## Next phase

**Coached Private Beta** — onboard pairs incrementally; collect feedback; triage via [BUG-TEMPLATE.md](./BUG-TEMPLATE.md).

---

## Related

- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md)
- [KNOWN-ISSUES.md](./KNOWN-ISSUES.md)
- [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)
- `docs/handoff/CURRENT-STATE.md`
