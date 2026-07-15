# Regression Checklist

Focused smoke and regression pass for FTC. Run before each beta release or after significant changes.

**Target time:** 45–90 minutes (mobile-first, then desktop spot-check)  
**Viewport:** Start at **390px** width; repeat critical paths at desktop (`≥768px`).

**Status:** Not Started · In Progress · Passed · Failed · Blocked

---

## Quick smoke (15 min)

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-01 | Login with valid credentials → lands in app | Not Started | Critical |
| R-02 | Bottom nav (mobile) or top nav (desktop) shows correct tabs for role | Not Started | Critical |
| R-03 | `/events` list loads without error | Not Started | Critical |
| R-04 | Open an event detail → page renders | Partial | Critical |
| R-04a | `/events/create` redirects to `/events?create=event` | Partial | High |
| R-04b | Invalid event ID shows safe not-found (no Postgres/SQL error text) | Partial | High |
| R-05 | `/dm` inbox loads | Not Started | Critical |
| R-06 | Open a DM conversation → send a text message → appears | Not Started | Critical |
| R-07 | `/bookings` (Gigs) loads for DJ account | Partial | Critical |
| R-07a | Logged out → `/bookings` redirects to `/login` (no hooks crash) | Partial | Critical |
| R-07b | Stale cached role without session → safe redirect (no fatal screen) | Partial | Critical |
| R-07c | Planner / DJ / Both roles still reach correct Gigs experience | Not Started | Critical |
| R-08 | Sign out from Settings → returns to login | Not Started | Critical |

---

## Authentication & onboarding

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-10 | Signup new account (if test env allows) | Not Started | High |
| R-11 | Onboarding role selection persists after refresh | Not Started | High |
| R-12 | Profile setup required before full app access | Not Started | High |
| R-13 | Password reset sends email; button shows “Email sent” cooldown | Not Started | Medium |
| R-14 | Invalid login shows error; no crash | Not Started | High |

---

## Events & booking

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-20 | Create event with required fields → appears in Active list | Not Started | Critical |
| R-21 | Create event validation: missing finish time shows inline error | Not Started | Medium |
| R-22 | Invite DJs → booking request appears in DJ Gigs Incoming | Not Started | Critical |
| R-23 | DJ accepts booking → status updates on event lineup + DM card | Not Started | Critical |
| R-24 | Rate proposal: open offer → DJ can counter → accept flow | Not Started | High |
| R-25 | Cancel accepted booking with reason → status cancelled | Not Started | High |
| R-26 | Edit event (booking-impacting field) → confirmation → crew chat update (if chat open) | Not Started | Medium |

---

## Calendar & Gigs

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-30 | Calendar shows events on correct dates | Not Started | High |
| R-31 | Cancelled event hidden from calendar (still in History) | Not Started | Medium |
| R-32 | Gigs mobile calendar card → tap opens event or DM | Not Started | High |
| R-33 | Gigs → Open conversation deep-links to booking card in DM | Not Started | Medium |
| R-34 | DJ availability save on mobile (optimistic, no layout jump) | Not Started | Medium |

---

## Messaging

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-40 | DM booking card expands/collapses; timestamps visible | Not Started | Medium |
| R-41 | View event from DM → Back returns to conversation | Not Started | Medium |
| R-42 | Crew chat accessible when 2+ DJs confirmed | Not Started | High |
| R-43 | Crew chat: new message appears without refresh | Not Started | High |
| R-44 | Messages unread badge on nav icon (mobile top-right) | Not Started | Medium |
| R-45 | Group tab in Messages inbox lists crew chats | Not Started | Medium |
| R-46 | DM inbox realtime: no message payload/content logs in production console | Partial | Medium |
| R-47 | Marketing home: no visible AI generate button (private beta) | Partial | Medium |
| R-48 | Manual create event via `/events?create=event` still works | Not Started | Critical |
| R-49 | Production security audit 16/16 pass | Blocked | Critical |
| R-50 | DM send after public-insert policy removed | Blocked | Critical |
| R-51 | Crew-chat send after public-insert policy removed | Blocked | Critical |

---

## History & read-only

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-55 | Past/cancelled event detail is read-only (no Edit) | Not Started | Medium |
| R-56 | Remove event from History → hidden from list (not deleted) | Not Started | Medium |
| R-57 | Gigs History bulk remove works | Not Started | Low |

---

## Performance & polish

| # | Test | Status | Severity if failed |
|---|------|--------|-------------------|
| R-60 | Hard refresh while logged in → app loads without long blank screen | Not Started | Medium |
| R-61 | Planner workspace tab switch (Events/Calendar/Gigs) — no stuck loading | Not Started | Medium |
| R-62 | Profile photo tap → fullscreen animate → close via backdrop | Not Started | Low |
| R-63 | No raw UUIDs visible in UI | Not Started | Medium |

---

## Regression sign-off

| Field | Value |
|-------|-------|
| Date | |
| Tester | |
| Commit / deploy | |
| Overall status | Not Started |
| Critical failures | |
| Notes | |

**Next step if Passed:** Proceed to [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)  
**Next step if Failed:** File bugs via [BUG-TEMPLATE.md](./BUG-TEMPLATE.md)
