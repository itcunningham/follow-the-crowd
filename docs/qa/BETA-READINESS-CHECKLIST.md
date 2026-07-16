# Beta Readiness Checklist

Master gate checklist for FTC private beta.

**Last updated:** 2026-07-16 (coached private beta GO)  
**Beta target:** Coached private beta — 5–10 Planner/DJ pairs  
**Go-live record:** [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md)  
**Known issues:** [KNOWN-ISSUES.md](./KNOWN-ISSUES.md)

## How to use

1. Work through [TEST-PLAN.md](./TEST-PLAN.md) for detailed cases.
2. Run [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md) before each release during beta.
3. File failures using [BUG-TEMPLATE.md](./BUG-TEMPLATE.md).
4. Use [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) for release coordination.

**Legend — Status:** Not Started · In Progress · Passed · Failed · Blocked

---

## Environment readiness

| Item | Status | Severity if failed | Owner | Notes |
|------|--------|-------------------|-------|-------|
| Vercel production deploy stable | Passed | Critical | Isaac | Confirmed stable at GO |
| Supabase migrations applied | Passed | Critical | Isaac | Including crew-chat auth + legacy message INSERT remediation |
| Production security audit 16/16 | Passed | Critical | Isaac | Confirmed 2026-07-16 |
| Production RLS hardened | Passed | Critical | Isaac | Legacy `allow public insert messages` removed |
| Supabase Auth: email confirmation, password policy, rate limits reviewed | Not Started | High | Isaac | Operational — confirm before broad invite |
| Google Maps API key restricted to approved domains | Not Started | High | Isaac | Operational — confirm before broad invite |
| Private beta signup controlled (invitations/allowlist) | Not Started | High | Isaac | Confirm approach before first tester invite |
| Test planner account available | Passed | Critical | QA | |
| Test DJ account available | Passed | Critical | QA | |
| Test “both” role account (optional) | Passed | Medium | QA | |
| Mobile test device / 390px emulator | Passed | High | QA | |
| iPhone Safari physical smoke | Passed | High | QA | 7/7 passed |

---

## Product areas

| Area | Status | Highest open severity | Blockers | Sign-off |
|------|--------|----------------------|----------|----------|
| Authentication | Passed | — | | QA |
| Profiles | Passed | Low | KN-03 latency | QA |
| Discover | Passed | — | Existing scope only | QA |
| Events | Passed | Medium | KN-01, KN-02, KN-06 | QA |
| Event Plans | Passed | — | | QA |
| Calendar | Passed | — | | QA |
| Gigs | Passed | — | | QA |
| Booking flow | Passed | — | | QA |
| Messaging (DM) | Passed | Medium | KN-02 back nav | QA |
| Crew chat | Passed | Low | KN-04 | QA |
| Realtime | Passed | — | | QA |
| Permissions | Passed | — | | QA |
| Performance | Passed | Low | KN-03 | QA |
| Accessibility | Passed | — | | QA |
| Edge cases | Passed | Low | KN-05, KN-06 | QA |
| Settings & account | Passed | — | | QA |

---

## QA evidence at GO (2026-07-16)

| Gate | Result |
|------|--------|
| Production security audit | 16/16 passed |
| Authenticated automated production QA | 8/8 passed |
| Physical iPhone Safari smoke | 7/7 passed |
| Open Critical defects | 0 |
| Open High defects | 0 |
| Production build | Passed |
| Production deployment | Stable |

---

## Resolved blocker fixes (2026-07-15)

| Fix | Status |
|-----|--------|
| `/bookings` hooks crash | Passed — verified in production QA |
| Crew-chat auto-start auth | Passed — migration applied; audit check #16 |
| `/events/create` + invalid IDs | Passed — verified in production QA |
| Message metadata logging | Passed — production console clean in QA |
| AI generation disabled | Passed — not in beta scope |
| Legacy public message INSERT | Passed — remediation applied; audit 16/16 |

---

## Open defects summary

| ID | Severity | Area | Summary | Status |
|----|----------|------|---------|--------|
| KN-01 | Medium | Events | Bookings row DJ profile tap | Accepted — see KNOWN-ISSUES.md |
| KN-02 | Medium | Navigation | Event → DM → Back lands on Messages | Accepted |
| KN-03 | Low | Profiles | Profile tab occasional slow response | Accepted |
| KN-04 | Low | Crew chat | View event return not always origin-preserving | Accepted |
| KN-05 | Low | Navigation | Secondary Run Sheet/profile return paths | Accepted |
| KN-06 | Low | Events | No sensible event name/venue character caps | Accepted |

No open **Critical** or **High** defects at GO.

---

## Beta go / no-go

| Criterion | Met? |
|-----------|------|
| Zero **Critical** open defects | ☑ |
| Zero **High** open defects | ☑ |
| Core product areas **Passed** (accepted Medium/Low documented) | ☑ |
| Production security audit **16/16** | ☑ |
| Authenticated production QA passed | ☑ |
| Product Owner sign-off | ☑ |

**Decision:** **GO** — coached private beta  
**Date:** 2026-07-16  
**Signed off by:** Product Owner (Isaac)

---

## Pre-invite operational items (not product gates)

See [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md) OP-01–OP-11. Complete before first tester invite.

**Pause rule:** Any new **Critical** or **High** production defect pauses tester onboarding.

---

## Post-beta follow-ups

| Item | Priority | Notes |
|------|----------|-------|
| KN-01 Bookings row profile tap | Medium | After beta feedback |
| KN-02 Event → DM → Back | Medium | Origin-preserving return |
| KN-03 Profile tab latency | Low | |
| KN-04 Crew chat return path | Low | |
| KN-05 Secondary return paths | Low | |
| KN-06 Event name/venue caps | Low | |
| AI re-enable review | Low | Post-beta only |
| Public launch criteria | — | Separate from coached beta |
