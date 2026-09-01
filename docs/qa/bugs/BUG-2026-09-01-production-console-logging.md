# Bug summary

**One-line title:** Messaging, reads, notification and booking debug `console.log` calls still ship to the production bundle — including one that logs a DM message's `text`

**Reported by:** QA retest (automated pass)
**Date:** 2026-09-01
**App version & build:** FTC Private Beta 0.9.0 · Commit `e1927a0`
**Environment:** Local production build (`npm run build`), inspected in `.next/static/chunks`

---

## Severity

- [ ] **Critical** — Data loss, security, auth broken, or core flow completely blocked
- [ ] **High** — Major feature unusable; no reasonable workaround
- [x] **Medium** — Partial breakage; workaround exists
- [ ] **Low** — Cosmetic, copy, or minor UX issue

Matches the Medium severity `REGRESSION-CHECKLIST.md` assigns to **R-46**. Everything logged
is visible only in the acting user's own browser console, on their own device, about their
own conversations — this is log hygiene, not a data leak to third parties.

---

## Testing status

- [x] **Failed** (this report)
- [ ] **Blocked** (cannot retest until fixed)

---

## User role & device

| Field | Value |
|-------|-------|
| Role | Promoter / DJ / Both — all roles, any account with messages |
| Phone (~390px) | Not tested — no live session available this pass |
| Desktop (~1280px) | Not tested — no live session available this pass |
| Also reproduced on other viewport? | N/A — the logging is viewport-independent (same client bundle) |
| Browser | Any — verified in the built bundle rather than at runtime |
| Account | None required to reproduce from the build |

---

## Area

- [x] Messaging (DM)
- [x] Realtime

Also touches Crew chat, Booking flow and Notifications (see the table below).

---

## Steps to reproduce

1. `npm run build`.
2. Search the emitted client chunks for the log prefixes, e.g.
   `grep -rlF "[bookings] Insert payload" .next/static`.
3. Every prefix in the table below is present in 7 chunks.

At runtime the equivalent is: open `/dm` with the console open (each render logs), open a
conversation (each mark-read logs), or cancel an event that has bookings.

---

## Expected result

R-46 and GO blocker #4 ("Message metadata logging", `CURRENT-STATE.md`) require the
production console to stay clean of message payload and metadata logging. `NODE_ENV`-gated
logs meet this: Next inlines `process.env.NODE_ENV`, so a gated call is dead-code-eliminated
from the bundle entirely.

---

## Actual result

The GO fix covered only the four files named in the blocker table — `app/dm/page.tsx`,
`app/dm/[conversationId]/page.tsx`, `lib/chatNewMessageHighlight.ts`, `lib/notifications.ts`
(partially). Those call sites are correctly gated today. The equivalent logging in the
`lib/` modules those pages call was never brought under a gate, and still ships:

| Log prefix | Source | What it emits |
|---|---|---|
| `[Inbox sort] DM before` / `DM after` | `lib/dmInbox.ts:169-170` (`applyDmInboxRealtimeMessage`) | every DM conversation UUID in the inbox, plus the arriving realtime message's `chatId`, `messageId`, `created_at` |
| `[Inbox render] DM rendered order` | `lib/dmInbox.ts:325`, called ungated at `app/dm/page.tsx:1325` on **every render** | conversation UUIDs + activity timestamps |
| `[Group rendered row ids]` | `lib/groupChats.ts:126`, called from the effect at `app/dm/page.tsx:1322` | crew-chat event UUIDs + activity timestamps |
| `[reads] current user id`, `conversation id`, `mark read result` | `lib/messageReads.ts:199-215` | signed-in user UUID, conversation UUID, read-through timestamps |
| `[reads] other participant id`, `loaded other last_read_at` | `lib/messageReads.ts:301-303` | the other participant's user UUID |
| `[notifications] Unread notifications for` | `lib/notifications.ts:255` | user UUID and, for every unread notification, its id, type, **title**, and link |
| `[bookings] Insert payload` | `lib/bookingRequests.ts:1136` | the full `messages` insert — `conversation_id`, `user_id`, and the message **`text`** |
| `[events] Notifying DJ of event cancellation…` (+ per-booking detail logs) | `lib/events.ts:795-850` | booking ids, recipient and conversation UUIDs |

`lib/bookingRequests.ts:1136` is the sharpest one: it is the only place that logs message
**content** rather than metadata, and it sits in the event-cancellation path (the text is
the system cancellation notice, not a user-typed DM).

### Scope note on R-46 as written

Read literally — "no message payload/content logs" on the **DM inbox realtime** path — R-46
passes: `applyDmInboxRealtimeMessage` logs ids and timestamps, never message text, and the
realtime handlers in `app/dm/page.tsx` are gated. Read as the GO blocker it came from
("Message **metadata** logging in realtime handlers"), it fails. Recorded as **Failed** on
the strength of the second reading, with the first stated here so nobody is misled about
which is which.

### Verification method

`process.env.NODE_ENV` is inlined at build time, so gated logs cannot survive into a
production chunk. Negative control confirms the method: `[chat highlight] render`
(gated at `lib/chatNewMessageHighlight.ts:11`) and `conversations error:`
(gated at `app/dm/page.tsx:567`) are **absent** from `.next/static`, while every prefix in
the table above is present.

**Not a finding:** `[ftc-dm-layout-trace]` (`lib/navigation/dmChatLayoutTrace.ts`) also ships,
but it is opt-in behind a `ftc-dm-layout-trace-enabled` sessionStorage flag in production —
a deliberate, silent-by-default diagnostic.

---

## Frequency

- [x] Always

---

## Console / network errors (if visible)

Log output only; no errors. No tokens, credentials or push endpoints are logged — the
"never log a full Web Push endpoint" rule in `CURRENT-STATE.md` is being honoured.

---

## Workaround (if any)

None needed by users; the logs are noise rather than a broken flow.

---

## Notes for Builder

* The mechanical fix is the same one already applied in `app/dm/page.tsx` — wrap each call
  in `if (process.env.NODE_ENV !== "production")`, or gate inside the `log*` helpers
  (`logInboxRenderOrder`, `logGroupRenderedRowIds`) so every caller is covered at once.
* `[bookings] Insert payload` is worth removing outright rather than gating: the surrounding
  block already logs the same insert's outcome, and nothing needs the message text echoed.
* `lib/notifications.ts` is a partial case — the badge-count logs at :366-368 are gated,
  the unread-notification dump at :255 is not. Same file, two conventions.
* Watch the render-path ones: `logInboxRenderOrder` is called in the `/dm` component body,
  so it fires on every render, not once per change.

---

## Retest checklist (after fix)

- [x] Original steps no longer reproduce the issue — none of the table's prefixes appear in `.next/static` after `npm run build`
- [x] Negative control still holds (a deliberately gated log is absent; an opt-in diagnostic like `[ftc-dm-layout-trace]` may remain)
- [ ] `/dm` inbox, open conversation, and event-cancellation flows produce a clean production console (Isaac: not explicitly re-checked post-fix)
- [ ] Related regression cases in `REGRESSION-CHECKLIST.md` still pass — R-40 to R-46 messaging rows
- [ ] Phone (~390px) verified
- [ ] Desktop (~1280px) verified
- [ ] Behavioural parity confirmed per `FTC_WORKFLOW.md` §7 — logging is bundle-level, so both viewports must come back identical
- [x] Intentional responsive differences documented (if any) — none expected
