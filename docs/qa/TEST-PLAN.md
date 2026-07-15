# FTC Test Plan

Detailed test plan for Follow The Crowd private beta. Each case is written for QA Reviewers — no code or database knowledge required.

**Default viewport:** Mobile **390px** unless noted. Also spot-check desktop (`≥768px`) for marked cases.

**Status:** Not Started · In Progress · Passed · Failed · Blocked

**Severity** (if case fails): Critical · High · Medium · Low

---

## Test accounts

| Role | Purpose |
|------|---------|
| Planner (promoter) | Events, calendar, invite DJs, crew chat |
| DJ | Gigs, availability, accept/decline bookings, DMs |
| Both (optional) | Nav shows Events + Gigs + Messages |

Prepare two accounts that can DM each other (planner sends booking to DJ).

---

## 1. Authentication

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| AUTH-01 | Login success | Open app → Login → enter valid email/password → submit | Redirected into app; nav visible | Critical | Not Started |
| AUTH-02 | Login failure | Enter wrong password | Error message; stay on login; no crash | High | Not Started |
| AUTH-03 | Signup | Create account with new email | Account created; onboarding or profile setup begins | High | Not Started |
| AUTH-04 | Logout | Settings → Sign out | Returned to login; back button cannot access protected pages | Critical | Not Started |
| AUTH-05 | Session persistence | Login → close tab → reopen app | Still logged in (or clean login prompt) | High | Not Started |
| AUTH-06 | Onboarding role | New user selects DJ or Promoter role | Role saved; correct nav tabs appear | High | Not Started |
| AUTH-07 | Profile setup gate | Incomplete profile tries to use app | Prompted to complete profile setup | Medium | Not Started |
| AUTH-08 | Password reset | Settings → Reset password | Success message “Password reset email sent — check your inbox”; button disabled 60s showing “Email sent” | Medium | Not Started |
| AUTH-09 | Protected routes | Logged out → visit `/events` directly | Redirected to login | Critical | Not Started |

---

## 2. Profiles

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| PROF-01 | View own profile | Profile tab → own profile | Name, username, bio, genres, social links display | High | Not Started |
| PROF-02 | View other profile | Discover or DM → open another user’s profile | Public info visible; Message action if applicable | High | Not Started |
| PROF-03 | Edit profile | Own profile → edit → change bio → save | Changes persist after refresh | High | Not Started |
| PROF-04 | Avatar upload | Edit profile → upload JPEG/PNG image | Avatar updates on profile | Medium | Not Started |
| PROF-05 | Fullscreen photo | Tap profile avatar (when photo exists) | Smooth open animation; tap dark area or X closes | Low | Not Started |
| PROF-06 | No UUID in UI | Scan profile and URLs in UI | No raw user IDs shown to users | Medium | Not Started |
| PROF-07 | Desktop profile layout | Repeat PROF-01 at desktop width | Single column centred layout; readable | Low | Not Started |
| PROF-08 | Genre tags | Profile with genres | Tags display; no overflow break layout | Low | Not Started |

---

## 3. Discover

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| DISC-01 | Discover loads | Open Discover (if in nav) | List of DJs or appropriate content | Medium | Not Started |
| DISC-02 | Open DJ profile | Tap a DJ card | Navigates to profile | Medium | Not Started |
| DISC-03 | Empty state | If no results (edge) | Sensible empty message; no crash | Low | Not Started |

---

## 4. Events

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| EVT-01 | Events list | Planner → Events tab | Active events listed; cards tappable | Critical | Not Started |
| EVT-02 | Create event | Create event → fill name, venue, date, start + finish time → save | Event appears in Active list | Critical | Not Started |
| EVT-03 | Validation — times | Save without finish time | Inline error; save blocked | Medium | Not Started |
| EVT-04 | Validation — notes | Exceed notes length limit | Save disabled or error shown | Low | Not Started |
| EVT-05 | Event detail | Tap event card | Hero, venue/date/time, lineup, run sheet sections | Critical | Not Started |
| EVT-06 | Flyer upload | Edit event → upload flyer image | Flyer shows on detail and list thumb | Medium | Not Started |
| EVT-07 | Fallback colour | Set event colour / Auto | Colour tile shows when no flyer | Low | Not Started |
| EVT-08 | Edit event | Change venue → save | Updates on detail; live on DM booking card if linked | High | Not Started |
| EVT-09 | Booking-impacting edit | Change date/time → confirm dialog | Confirmation required; crew chat update if chat exists | Medium | Not Started |
| EVT-10 | Cancel event | Cancel event → confirm | Status cancelled; read-only where expected | High | Not Started |
| EVT-11 | Delete event | Delete (if available) → confirm | Removed from Active list | High | Not Started |
| EVT-12 | History tab | Switch to History | Past/cancelled events listed | Medium | Not Started |
| EVT-13 | History read-only | Open past/cancelled event | No Edit / Invite DJs; historical copy | Medium | Not Started |
| EVT-14 | Remove from History | Select events → Remove from history | Hidden from History; not deleted from system | Medium | Not Started |
| EVT-15 | Run sheet | Event with accepted DJ | Run sheet row appears | Medium | Not Started |
| EVT-16 | Invite DJs | Event detail → Invite DJs → select DJs → Confirm | Booking requests sent; label “Confirm N DJ(s)” | Critical | Not Started |
| EVT-17 | Lineup filters | Filter all / pending / accepted / declined | Correct subset shown | Medium | Not Started |
| EVT-18 | Desktop event detail | Repeat EVT-05 at desktop | Layout wider; same data | Low | Not Started |

---

## 5. Event Plans

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| PLAN-01 | List plans | Event Plans tab | Saved plans listed | Medium | Not Started |
| PLAN-02 | Create plan | Save new plan with name, venue, notes | Appears in list | Medium | Not Started |
| PLAN-03 | Use plan | Use plan → create event | Form prefilled from plan | Medium | Not Started |
| PLAN-04 | Bulk delete | Select plans → delete → confirm | Removed from list | Low | Not Started |
| PLAN-05 | Notes validation | Plan notes over limit | Save blocked | Low | Not Started |

---

## 6. Calendar

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| CAL-01 | Calendar loads | Calendar tab | Month/date strip visible | High | Not Started |
| CAL-02 | Mobile date strip | Tap dates on strip | Agenda updates for selected day | High | Not Started |
| CAL-03 | Status dots | Days with bookings | Dot colour priority: Accepted > Pending > Upcoming | Medium | Not Started |
| CAL-04 | Today styling | Select today | Today outline distinct from selected | Low | Not Started |
| CAL-05 | Cancelled hidden | Cancel an event | Event gone from calendar; still in History | Medium | Not Started |
| CAL-06 | Agenda card | Tap event on agenda | Opens event detail | High | Not Started |
| CAL-07 | Create from calendar | Create event from calendar flow | Save → Confirm N DJ(s) flow works | Medium | Not Started |
| CAL-08 | Desktop grid | Desktop width → month grid | Grid + day panel; same events as mobile | Medium | Not Started |
| CAL-09 | Past date strip | Dates before today | No dots/counts on strip; past agenda still viewable | Low | Not Started |
| CAL-10 | Empty day | Select day with no events | Empty hint; no crash | Low | Not Started |

---

## 7. Gigs

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| GIG-01 | Gigs loads | DJ → Gigs tab | Incoming / Confirmed / History tabs | Critical | Not Started |
| GIG-02 | Incoming booking | Planner sends request | Appears in DJ Incoming | Critical | Not Started |
| GIG-03 | Accept booking | DJ accepts from Gigs or DM | Moves to Confirmed; event lineup updates | Critical | Not Started |
| GIG-04 | Decline booking | DJ declines | Status declined; planner sees update | High | Not Started |
| GIG-05 | Open DM from Gigs | Tap Open conversation | DM opens; scrolls to booking card | Medium | Not Started |
| GIG-06 | View event from Gigs | Tap View event | Event detail opens | Medium | Not Started |
| GIG-07 | History tab | Past gigs in History | Cards show fee copy (Fixed · / Open offer) | Low | Not Started |
| GIG-08 | History remove | Bulk remove from History | Hidden per user | Low | Not Started |
| GIG-09 | Mobile calendar in Gigs | Gigs calendar view → tap booked card | Navigates correctly (iOS: use real device if possible) | High | Not Started |
| GIG-10 | Availability — mobile | Set Available / Maybe / Unavailable on date | Saves; pill state stable (no layout jump) | Medium | Not Started |
| GIG-11 | Availability — past date | Select past date | Controls hidden; historical data visible | Low | Not Started |
| GIG-12 | Pending badge | Incoming pending count | Gigs nav badge shows count | Medium | Not Started |

---

## 8. Booking flow

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| BOOK-01 | Send booking DM | Planner invites DJ | DJ receives DM with booking card | Critical | Not Started |
| BOOK-02 | Pending card | View pending card in DM | Event name, venue, date, time, rate shown | High | Not Started |
| BOOK-03 | Fixed offer | Send fixed rate offer | Card shows “Fixed · $X” | Medium | Not Started |
| BOOK-04 | Open offer | Send open offer (ask for rate) | DJ can propose counter rate | High | Not Started |
| BOOK-05 | Accept proposal | Accept rate proposal | Booking accepted; system message in DM | High | Not Started |
| BOOK-06 | Decline proposal | Decline rate proposal | Status updated; clear messaging | Medium | Not Started |
| BOOK-07 | Duplicate protection | Invite same DJ twice for same event | Second invite blocked or handled gracefully | Medium | Not Started |
| BOOK-08 | Cancel accepted | Planner or DJ cancels with reason | Status cancelled; group chat update if applicable | High | Not Started |
| BOOK-09 | Live event fields | Edit event after booking sent | DM card shows updated event fields | High | Not Started |
| BOOK-10 | Expand card notes | Long notes → Show more | Notes expand; timestamps not clipped | Medium | Not Started |
| BOOK-11 | View event from card | View event link on card | Event detail; Back returns to DM | Medium | Not Started |

---

## 9. Messaging (DM)

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| MSG-01 | Inbox loads | Messages tab | Conversation list with previews | Critical | Not Started |
| MSG-02 | Open conversation | Tap conversation | Header with name/avatar; messages load | Critical | Not Started |
| MSG-03 | Send text | Type message → send | Message appears at bottom | Critical | Not Started |
| MSG-04 | Timestamps | View messages | Relative times (e.g. 7m, Yesterday) | Low | Not Started |
| MSG-05 | Photo attach | Attach photo from library | Image sends in conversation | Medium | Not Started |
| MSG-06 | Profile from header | Tap avatar or details | Profile sheet or link works | Medium | Not Started |
| MSG-07 | Unread badge | Receive message while away | Messages nav badge increments | Medium | Not Started |
| MSG-08 | Mark read | Open conversation | Badge decrements | Medium | Not Started |
| MSG-09 | Empty conversation | New conversation edge | Sensible empty state | Low | Not Started |
| MSG-10 | Desktop width | DM at lg+ | Wider centred column (~52rem) | Low | Not Started |
| MSG-11 | Group tab | Messages → Group tab | Crew chats listed by event | Medium | Not Started |

---

## 10. Crew chat

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| CREW-01 | Access gate | Event with 0 confirmed DJs | Crew chat not available or clear message | Medium | Not Started |
| CREW-02 | Open crew chat | Event with 2+ accepted DJs | Chat opens from event or Group inbox | High | Not Started |
| CREW-03 | Header | View crew chat header | Event name; “Crew chat • N members”; avatars | Low | Not Started |
| CREW-04 | Send message | Send text in crew chat | Message appears for all participants | Critical | Not Started |
| CREW-05 | System message | DJ accepts booking | System pill (e.g. “X joined the crew”) centred | Low | Not Started |
| CREW-06 | Sender names | Two users send messages | Name above first message in sequence only | Low | Not Started |
| CREW-07 | Empty state | New crew chat, no messages | Subtle centred placeholder | Low | Not Started |
| CREW-08 | View event button | From messages-origin chat | Compact View event button with calendar icon | Low | Not Started |
| CREW-09 | Back navigation | Back from crew chat | Returns to event or messages as expected | Medium | Not Started |
| CREW-10 | DJ without access | Non-crew DJ tries chat URL | Access denied message | High | Not Started |

---

## 11. Realtime

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| RT-01 | DM realtime | User A sends DM while User B has conversation open | Message appears without refresh | Critical | Not Started |
| RT-02 | Crew realtime | Send crew message; other member viewing | Appears without refresh | Critical | Not Started |
| RT-03 | Inbox preview | New message while on inbox | Preview updates | Medium | Not Started |
| RT-04 | Badge update | New message while elsewhere in app | Messages badge updates | Medium | Not Started |
| RT-05 | Tab background | Send message while tab in background → focus tab | Messages visible | Medium | Not Started |

---

## 12. Permissions

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| PERM-01 | Planner nav | Login as promoter | Events, Event Plans, Calendar, Messages, Profile | High | Not Started |
| PERM-02 | DJ nav | Login as DJ | Gigs, Messages, Profile (no Events create) | High | Not Started |
| PERM-03 | Both nav | Login as both | Events + Gigs + Messages | High | Not Started |
| PERM-04 | Own events only | Planner A cannot edit Planner B’s event | No edit access or error | Critical | Not Started |
| PERM-05 | Booking actions | DJ cannot accept another DJ’s booking | Action unavailable | Critical | Not Started |
| PERM-06 | Crew chat membership | Non-member cannot post in crew chat | Blocked or read-only | High | Not Started |
| PERM-07 | Profile privacy | Cannot view private fields of other users | Only public profile data | Medium | Not Started |

---

## 13. Performance

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| PERF-01 | Cold start | Hard refresh while logged in | App shell appears quickly; no 5s+ blank | Medium | Not Started |
| PERF-02 | Nav badge hydration | Hard refresh on Gigs/Messages | Badge count stable (minimal pop-in) | Low | Not Started |
| PERF-03 | Tab switch | Switch Events ↔ Calendar ↔ Gigs rapidly | Loading shells; no permanent stuck state | Medium | Not Started |
| PERF-04 | Large inbox | User with many DMs | Inbox scrolls smoothly | Low | Not Started |
| PERF-05 | Event list | Many events | List scrolls; images load progressively | Low | Not Started |

---

## 14. Accessibility

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| A11Y-01 | Keyboard focus | Tab through login form | Visible focus ring | Medium | Not Started |
| A11Y-02 | Escape closes modal | Open modal/dialog → Escape | Closes (where implemented) | Low | Not Started |
| A11Y-03 | Photo viewer Escape | Fullscreen profile photo → Escape | Closes viewer | Low | Not Started |
| A11Y-04 | Button labels | Icon-only buttons | aria-label present (inspect if needed) | Low | Not Started |
| A11Y-05 | Colour contrast | Read primary text on surfaces | Readable on mobile in normal light | Low | Not Started |
| A11Y-06 | Motion reduce | OS prefers reduced motion | Animations reduced or off | Low | Not Started |

---

## 15. Edge cases

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| EDGE-01 | Long event name | Very long name in list/detail | Truncates; no layout break | Low | Not Started |
| EDGE-02 | Long venue name | Long venue on calendar card | Truncates with ellipsis | Low | Not Started |
| EDGE-03 | Timezone date boundary | Event near midnight local | Correct calendar date | Medium | Not Started |
| EDGE-04 | Offline send | Send message with network off | Error shown; no silent loss | Medium | Not Started |
| EDGE-05 | Cancelled event DM | Open DM for cancelled booking | Card shows cancelled state | Medium | Not Started |
| EDGE-06 | Empty Events list | New planner, no events | Empty state; create CTA | Low | Not Started |
| EDGE-07 | Empty Gigs Incoming | New DJ, no bookings | Empty state | Low | Not Started |
| EDGE-08 | iOS Safari nav | Calendar/Gigs tab switch on iPhone | Tabs respond on tap | High | Not Started |
| EDGE-09 | iOS back gesture | DM → event → back | Returns to correct conversation | Medium | Not Started |
| EDGE-10 | Account deletion mailto | Settings → Request account deletion | Mail client opens with prefilled request | Low | Not Started |

---

## 16. Settings & account

| ID | Test case | Steps | Expected result | Severity | Status |
|----|-----------|-------|-----------------|----------|--------|
| SET-01 | Settings loads | Profile → Settings | Email shown; sections visible | Medium | Not Started |
| SET-02 | Password reset copy | Reset password success | “Password reset email sent — check your inbox” (no full stop) | Low | Not Started |
| SET-03 | Reset cooldown | After reset success | Button “Email sent” disabled ~60s | Low | Not Started |
| SET-04 | Sign out placement | View Account card | Sign out separated below password section | Low | Not Started |
| SET-05 | Support copy | Support section | No trailing period on description | Low | Not Started |

---

## Test execution log

| Date | Tester | Areas completed | Pass | Fail | Blocked | Notes |
|------|--------|-----------------|------|------|---------|-------|
| | | | | | | |

---

## Related documents

- [BETA-READINESS-CHECKLIST.md](./BETA-READINESS-CHECKLIST.md)
- [REGRESSION-CHECKLIST.md](./REGRESSION-CHECKLIST.md)
- [BUG-TEMPLATE.md](./BUG-TEMPLATE.md)
- [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)
