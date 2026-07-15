# Beta Readiness Checklist

Master gate checklist for FTC private beta. Mark each area when QA has completed testing and sign-off is ready.

**Last updated:** 2026-07-15 (Beta Readiness blocker-fix batch)  
**Beta target:** Private beta (planner + DJ testers)

## Beta Readiness blocker fixes (2026-07-15)

Builder batch addressing QA + Security Review blockers. **Next:** QA Agent authenticated regression (Planner, DJ, Both; two browsers; iPhone Safari + production).

| Fix | Root cause | Status | Builder verification | Production-only still required |
|-----|------------|--------|----------------------|------------------------------|
| `/bookings` hooks crash | `showDetailsPlanSkeleton` `useMemo` after conditional `return null` in `BookingsPageContent` | Partial | `npm run build` passes; hook order fixed | Logged-out/stale-session redirect on production |
| Crew-chat auto-start auth | `ensure_event_crew_chat_auto_started` callable by any authenticated user | Blocked | Migration + audit check #16 in repo | Isaac: run migration in production Supabase |
| `/events/create` + invalid IDs | `[eventId]` captured `create`; invalid UUIDs surfaced Postgres `22P02` | Partial | Redirect route + UUID guard; build passes | QA invalid/deleted IDs on production |
| Message metadata logging | Debug `console.log` in DM inbox realtime handlers | Partial | Logs removed/gated in messaging files | QA: no payload logs in prod console |
| AI generation disabled | Private beta excludes AI | Partial | Feature flags; marketing AI UI hidden | QA: no AI button on production home |

**Deploy order:** (1) Run `supabase/migrations/20250715180000_harden_crew_chat_auto_start_auth.sql` in production, (2) deploy Next.js, (3) run `scripts/supabaseSecurityAuditChecklist.sql` (all rows pass).

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
| Supabase migrations applied (see `docs/handoff/SUPABASE.md`) | Blocked | Critical | Isaac | `20250715180000_harden_crew_chat_auto_start_auth.sql` pending production run |
| Production security audit checklist all rows pass | Not Started | Critical | Isaac | `scripts/supabaseSecurityAuditChecklist.sql` — includes new crew auto-start check |
| Production RLS hardened; no legacy `using (true)` bootstrap policies | Not Started | Critical | Isaac | Repo inspection only — must verify in production |
| Supabase Auth: email confirmation, password policy, rate limits reviewed | Not Started | High | Isaac | |
| Google Maps API key restricted to approved production/preview domains | Not Started | High | Isaac | |
| Private beta signup controlled (invitations/allowlist; not open public signup) | Not Started | High | Isaac | No custom invitation system in this batch |
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
| Events | Partial | High | `/events/create` redirect + invalid ID guard — QA verify | |
| Event Plans | Not Started | — | | |
| Calendar | Not Started | — | | |
| Gigs | Partial | Critical | `/bookings` hooks fix — QA redirect + role regression | |
| Booking flow | Not Started | — | | |
| Messaging (DM) | Partial | Medium | Production payload logging removed — QA console check | |
| Crew chat | Blocked | Critical | RPC auth migration pending production apply | |
| Realtime | Partial | Medium | Inbox handler logging gated — behaviour unchanged | |
| Permissions | Partial | High | Crew-chat RPC hardened in migration (production pending) | |
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
| BR-01 | Critical | Gigs | `/bookings` hooks crash when logged out / stale session | Fixed in code — QA verify |
| BR-02 | Critical | Security | `ensure_event_crew_chat_auto_started` missing caller authorization | Migration ready — production apply pending |
| BR-03 | High | Events | `/events/create` exposed Postgres error; invalid event IDs unsafe | Fixed in code — QA verify |
| BR-04 | Medium | Messaging | Production console logged realtime message payloads | Fixed in code — QA verify prod console |
| BR-05 | Medium | Marketing | AI generation visible during private beta | Disabled via feature flags — QA verify prod home |

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
