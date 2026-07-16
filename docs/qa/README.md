# FTC Beta Readiness — QA workspace

Official QA documentation for Follow The Crowd (FTC) coached private beta.

**Audience:** QA Reviewers, Isaac (product owner), and release coordinators.

**Current phase:** **Coached Private Beta** (GO — 2026-07-16)

## Documents

| File | Purpose |
|------|---------|
| [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md) | Go-live record, evidence, operational pre-invite checklist |
| [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) | Accepted Medium/Low issues for coached beta |
| [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md) | Master gate checklist — product areas and GO decision |
| [TEST-PLAN.md](./TEST-PLAN.md) | Detailed test cases with steps and expected results |
| [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md) | Focused smoke + regression pass before each release |
| [BUG-TEMPLATE.md](./BUG-TEMPLATE.md) | Standard format for filing bugs |
| [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) | Pre-release, operational, and release-day steps |
| [AUTHENTICATED-E2E.md](./AUTHENTICATED-E2E.md) | Playwright authenticated production harness |

## Beta scope (approved)

- **5–10 coached Planner/DJ pairs** with existing working relationships preferred
- Controlled invitations/access — not broad cold onboarding, not public launch
- **Out of scope:** payments, AI generation, Discover expansion, social features, or other new product scope

## Evidence at GO (2026-07-16)

| Gate | Result |
|------|--------|
| Production security audit | 16/16 passed |
| Authenticated automated production QA | 8/8 passed |
| Physical iPhone Safari smoke | 7/7 passed |
| Critical / High open defects | 0 / 0 |

## Conventions

### Severity (for bugs and blockers)

| Level | Meaning |
|-------|---------|
| **Critical** | Data loss, security breach, auth broken, or core flow completely blocked |
| **High** | Major feature unusable; no reasonable workaround |
| **Medium** | Feature partially broken; workaround exists |
| **Low** | Cosmetic, copy, or minor UX inconsistency |

### Testing status

| Status | Meaning |
|--------|---------|
| **Not Started** | Not yet tested |
| **In Progress** | Testing underway |
| **Passed** | Meets expected behaviour |
| **Failed** | Does not meet expected behaviour — file a bug |
| **Blocked** | Cannot test (dependency, environment, or known defect) |

## Before you test

1. Read `docs/handoff/CURRENT-STATE.md` for the latest feature inventory.
2. Review [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) for accepted limitations.
3. Test **mobile-first** at **390px** width, then spot-check desktop (`md+`).
4. Use at least one **planner** account and one **DJ** account (a **both** role account is helpful).
5. For automated authenticated production regression, see [AUTHENTICATED-E2E.md](./AUTHENTICATED-E2E.md).
6. **Never commit** `.env.qa.local`, tokens, credentials, or Playwright storage states.

## Pause rule

Any new **Critical** or **High** production defect **pauses tester onboarding** until triaged.

## Related docs

- `FTC_WORKFLOW.md` — Builder / Reviewer / QA roles
- `docs/handoff/` — Product context and shipped features
- `docs/design/FTC_DESIGN_SYSTEM.md` — Visual and UX conventions
