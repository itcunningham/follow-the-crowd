# FTC Beta Readiness — QA workspace

Official QA documentation for Follow The Crowd (FTC) private beta.

**Audience:** QA Reviewers, Isaac (product owner), and release coordinators. No implementation knowledge required.

## Documents

| File | Purpose |
|------|---------|
| [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md) | Master gate checklist — track beta readiness by product area |
| [TEST-PLAN.md](./TEST-PLAN.md) | Detailed test cases with steps and expected results |
| [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md) | Focused smoke + regression pass before each release |
| [BUG-TEMPLATE.md](./BUG-TEMPLATE.md) | Standard format for filing bugs |
| [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) | Pre-release and release-day steps |

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
2. Confirm which Supabase migrations/scripts Isaac has applied (`docs/handoff/SUPABASE.md`).
3. Test **mobile-first** at **390px** width, then spot-check desktop (`md+`).
4. Use at least one **planner** account and one **DJ** account (a **both** role account is helpful).
5. Do not assume SQL migrations are applied unless Isaac confirms.

## Related docs

- `FTC_WORKFLOW.md` — Builder / Reviewer / QA roles
- `docs/handoff/` — Product context and shipped features
- `docs/design/FTC_DESIGN_SYSTEM.md` — Visual and UX conventions
