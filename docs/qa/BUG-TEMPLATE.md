# Bug report template

Copy this template when filing a bug. Paste into GitHub Issues, Slack, or your tracking tool.

---

## Bug summary

**One-line title:** [Short description]

**Reported by:** [Name]  
**Date:** [YYYY-MM-DD]  
**App version & build:** [Copy from Settings — e.g. `FTC Private Beta 0.9.0 · Build abc1234`]  
**Environment:** [Local / Vercel production / Preview]

---

## Severity

Select one:

- [ ] **Critical** — Data loss, security, auth broken, or core flow completely blocked
- [ ] **High** — Major feature unusable; no reasonable workaround
- [ ] **Medium** — Partial breakage; workaround exists
- [ ] **Low** — Cosmetic, copy, or minor UX issue

---

## Testing status

- [ ] **Failed** (this report)
- [ ] **Blocked** (cannot retest until fixed)

---

## User role & device

| Field | Value |
|-------|-------|
| Role | Promoter / DJ / Both |
| Viewport | Mobile (~390px) / Tablet / Desktop |
| Browser | e.g. Safari iOS 17, Chrome 120 |
| Account | Test account identifier (no passwords) |

---

## Area

Select one primary area:

- [ ] Authentication
- [ ] Profiles
- [ ] Discover
- [ ] Events
- [ ] Event Plans
- [ ] Calendar
- [ ] Gigs
- [ ] Booking flow
- [ ] Messaging (DM)
- [ ] Crew chat
- [ ] Realtime
- [ ] Permissions
- [ ] Performance
- [ ] Accessibility
- [ ] Edge cases / Other

---

## Steps to reproduce

1. 
2. 
3. 

---

## Expected result

[What should happen]

---

## Actual result

[What happened instead]

---

## Frequency

- [ ] Always
- [ ] Often
- [ ] Sometimes
- [ ] Once

---

## Screenshots / screen recording

[Attach or link]

---

## Console / network errors (if visible)

[Paste any error messages from browser dev tools — no secrets]

---

## Workaround (if any)

[Optional]

---

## Notes for Builder

[Optional — e.g. “Only happens when returning from Calendar via back link”]

---

## Retest checklist (after fix)

- [ ] Original steps no longer reproduce the issue
- [ ] Related regression cases in `REGRESSION-CHECKLIST.md` still pass
- [ ] Mobile (390px) verified
- [ ] Desktop spot-check (if applicable)
