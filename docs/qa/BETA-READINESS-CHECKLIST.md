# Beta Readiness Checklist

Master gate checklist for FTC private beta. Mark each area when QA has completed testing and sign-off is ready.

**Last updated:** 2026-07-15  
**Beta target:** Private beta (planner + DJ testers)

## How to use

1. Work through [TEST-PLAN.md](./TEST-PLAN.md) for detailed cases.
2. Run [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md) before declaring an area ready.
3. File failures using [BUG-TEMPLATE.md](./BUG-TEMPLATE.md).
4. Use [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) before production deploy.

**Legend — Status:** Not Started · In Progress · Passed · Failed · Blocked

---

## Environment readiness

| Item | Status | Severity if failed | Owner | Notes |
|------|--------|-------------------|-------|-------|
| Vercel production deploy matches latest `main` | Not Started | Critical | Isaac | |
| Supabase migrations applied (see `docs/handoff/SUPABASE.md`) | Not Started | Critical | Isaac | |
| Test planner account available | Not Started | Critical | QA | |
| Test DJ account available | Not Started | Critical | QA | |
| Test “both” role account available (optional) | Not Started | Medium | QA | |
| Mobile test device or 390px emulator ready | Not Started | High | QA | |
| iOS Safari spot-check device available | Not Started | High | QA | Touch nav quirks documented in handoff |

---

## Product areas

| Area | Status | Highest open severity | Blockers | Sign-off |
|------|--------|----------------------|----------|----------|
| Authentication | Not Started | — | | |
| Profiles | Not Started | — | | |
| Discover | Not Started | — | | |
| Events | Not Started | — | | |
| Event Plans | Not Started | — | | |
| Calendar | Not Started | — | | |
| Gigs | Not Started | — | | |
| Booking flow | Not Started | — | | |
| Messaging (DM) | Not Started | — | | |
| Crew chat | Not Started | — | | |
| Realtime | Not Started | — | | |
| Permissions | Not Started | — | | |
| Performance | Not Started | — | | |
| Accessibility | Not Started | — | | |
| Edge cases | Not Started | — | | |
| Settings & account | Not Started | — | | |

---

## Area summaries (what “Passed” means)

### Authentication
Signup, login, logout, onboarding, role selection, and password reset work on mobile and desktop. Unauthenticated users cannot reach protected pages.

### Profiles
Public profiles display correctly. Own profile edit/setup saves. Avatar fullscreen viewer works. No raw user IDs shown in UI.

### Discover
DJ discovery list loads. Profile links work. Appropriate empty states.

### Events
Create, edit, cancel, delete, list (Active/History), detail view, flyer upload, validation, run sheet, invite DJs, and history hide behave as documented.

### Event Plans
Save, list, use plan to create event, bulk delete.

### Calendar
Mobile date strip + agenda; desktop grid + day panel. Dots, sorting, create-from-calendar, cancelled events hidden from calendar.

### Gigs
Incoming / Confirmed / History tabs. Booking cards, Open DM deep links, availability calendar, calendar navigation on mobile.

### Booking flow
Send requests, pending/accepted/declined/cancelled states, rate proposals (open/fixed/counter), DM booking cards, cancellation with reason.

### Messaging (DM)
Inbox, conversations, text messages, booking cards, timestamps, composer, photo attach, profile links, unread badge.

### Crew chat
Per-event crew chat for accepted DJs + planner. System messages, sender grouping, empty state, access rules.

### Realtime
New DM and crew messages appear without manual refresh. Badge counts update reasonably quickly.

### Permissions
Planner vs DJ vs both see correct nav and actions. Users cannot access others’ private data through UI.

### Performance
Cold start feels responsive. Nav badges do not pop in incorrectly. No obvious layout thrash on tab switch.

### Accessibility
Keyboard Escape closes modals where implemented. Focus visible on interactive elements. Dialogs labelled.

### Edge cases
History/read-only events, cancelled events, empty states, long text truncation, timezone/date edge cases.

### Settings & account
Password reset email + cooldown, sign out, account deletion request mailto.

---

## Open defects summary

| ID | Severity | Area | Summary | Status |
|----|----------|------|---------|--------|
| — | — | — | No defects filed yet | — |

---

## Beta go / no-go

| Criterion | Met? |
|-----------|------|
| Zero **Critical** open defects | ☐ |
| Zero **High** open defects (or accepted exceptions documented) | ☐ |
| All product areas **Passed** or **Blocked** with accepted risk | ☐ |
| Regression checklist **Passed** on production | ☐ |
| Isaac sign-off | ☐ |

**Decision:** Not Started  
**Date:**  
**Signed off by:**

---

## Post-beta follow-ups

| Item | Priority | Notes |
|------|----------|-------|
| | | |
