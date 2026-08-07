# Follow The Crowd (FTC) — Full Claude Handover

**Audience:** Claude (Claude Code, Claude in Cursor, or any Claude Builder session).  
**Created for paste / day-one context:** 2026-08-06  
**Repo:** `itcunningham/follow-the-crowd`  
**Production:** push to `main` → Vercel → `https://follow-the-crowd.vercel.app`  
**Local (Isaac’s machine):** `/Users/isaaccunningham/Projects/FTC`  
**Legacy name:** “eventos” still appears in some paths — same product.

**This file is the single start document.** Read it fully. Then deepen with linked docs. Do not invent process, product scope, or architecture.

### Paste to start a session

```
You are Builder for Follow The Crowd (FTC).
Read docs/handoff/CLAUDE-FULL-HANDOVER.md fully, then skim docs/handoff/CURRENT-STATE.md (top + anything relevant to the task).
Follow FTC_WORKFLOW.md, AGENTS.md, and Isaac’s preferences in this handover.
Ship finished work to Production via main in the same turn.
One task only.
My task: [PASTE TASK]
```

### Must-read order after this file

1. `docs/handoff/CURRENT-STATE.md` — what is actually shipped (authoritative product truth)
2. `docs/handoff/BRAND-PHILOSOPHY.md` — mission / enemy / feature gate
3. `docs/handoff/PRODUCT-HANDOVER.md` — stage, beta, metrics, roadmap layers
4. `FTC_WORKFLOW.md` — Builder / Reviewer / QA
5. `docs/handoff/MULTI-AGENT-WORKFLOW.md` — if any other agent might touch the repo
6. `docs/design/FTC_DESIGN_SYSTEM.md` — for UI work
7. `docs/handoff/CLAUDE-IMPLEMENTATION-HANDOVER.md` — deep technical patterns / debt (when needed)
8. `AGENTS.md` (root `CLAUDE.md` only points here)

**Doc trust ranking:** (1) code + `git log` (2) `CURRENT-STATE.md` (3) this file + `FTC_WORKFLOW` / `AGENTS` / design system (4) older START-HERE / KNOWN-ISSUES / parts of SUPABASE (verify — can lag).

---

## 1. What FTC is

**Follow The Crowd** is a mobile-first app that connects **promoters / event planners** and **DJs**.

It is **not** a social media app. It starts by solving:

> Running events is messy — Instagram DMs, WhatsApp, Sheets, email, Notes, calendars are scattered.

FTC replaces that with one workflow OS:

```
Event → Bookings → Crew Chat → Run Sheet → Execution
```

The **event owns the communication** — not random group chats.

**Philosophy:** Workflow first. Community second. Content third.  
**Enemy:** friction (not Instagram, not competitors).  
**Cultural line:** For the Culture. / For the culture, not the clout.

Always ask: **Does this reduce work tonight?** Not: **Is this a cool feature?**

### Roles in the product

| Role | Core jobs |
|------|-----------|
| **Promoter / planner** | Events, Event Plans, Calendar, send booking requests via DM, lineups, run sheets, crew chat |
| **DJ** | Profiles, receive bookings, rate proposals, availability, DMs, Gigs (Incoming / Confirmed / History), crew chat |
| **both** | Planner + DJ surfaces |

### Current stage (honest)

- **Coached private beta 0.9.0** (GO decision 2026-07-16)
- Strong enough to test seriously — **not** proven PMF, paid conversion, or Melbourne default status
- **Next milestone is real usage**, not more vision
- Out of scope for this beta: payments, AI event generation (disabled), Discover expansion, social feed, unrestricted public signup, tickets/ads/accounting as core product

Interview evidence and beta coaching notes: `PROMOTER-INTERVIEWS.md`. Distilled product read stays in `BRAND-PHILOSOPHY.md`.

### Success metrics (what matters)

Not downloads. Track: weekly active promoters, events created, booking send/accept rates, % using Crew Chat / Run Sheet, return the next week, second real event without reminders.

Strongest early signal: promoters use FTC for **another** event without being reminded.

---

## 2. Who we are (the team)

| Who | Role | Does | Does not |
|-----|------|------|----------|
| **Isaac Cunningham** | Founder / product owner | Final UX + release decisions. Runs SQL in Supabase SQL Editor. Real-device QA (phone + desktop). Talks to users. Invites beta testers. | Should not be asked to run agent-capable steps (inspect, build, fix) |
| **Cursor Agent** | Product partner + often Builder | Product/UX/priority, challenges feature creep, coordinates agents; also implements in-repo when acting as Builder | Does not invent features beyond the task |
| **Claude (you)** | Builder | Inspect repo, implement, `npm run build`, regressions, commit/push, merge finished work to `main`, update handoff | Does not invent product scope. Does not assume SQL was applied |
| **QA Reviewer** | Independent break-testing | Test plans, phone/desktop parity | Does not implement fixes; never commits |
| **Release Agent** | Integrate to Production | Merge approved branches, prove Production serves the commit | Not “No target” Preview |
| **ChatGPT** | **Deprecated** for live FTC product work | Historical specs may exist | Not the live product partner. Prefer Cursor + `docs/handoff/` |

Plain terms:

> Isaac decides what FTC should become. Builders build it. Cursor helps make sure you’re building the right thing, in the right order, and that agents aren’t bullshitting you.

### One writer rule

Only **one** Builder may edit a given worktree at a time.  
If multiple agents run: each gets its own worktree via `scripts/ftc-worktree.sh` — see `MULTI-AGENT-WORKFLOW.md` (authoritative).  
**Never `git stash` in a shared tree** — that has destroyed other sessions’ work.

---

## 3. How Isaac works (obey these)

Source of truth: `docs/handoff/USER-PREFERENCES.md`.

### Communication

- **Simple and straightforward.** Less reading for him.
- **Do the work** — inspect, run commands, fix build errors yourself. Don’t dump homework.
- **Short answers** unless he asks for a full report.
- Prefer pointed results over essays.
- **Brutal honesty. No ego.** Never agree just to be agreeable. If his idea is weaker, say so plainly, explain why, recommend the better path. Push back on friction, redundancy, and “safe” patterns that make the product worse. Goal = best app, not consensus.
- Act as a **strict intellectual critic** on ideas/UX/plans — point out flaws and weak logic; do not praise by default.
- When useful (or when he asks): give **strong counterarguments a hostile expert would use** before locking a plan.
- Prioritize factual truth over politeness.

### SQL

When he needs to run SQL in Supabase: paste **full file contents only**.  
**No explanation. No markdown code fences.** Raw SQL text only.

### Git & deploy (standing, locked 2026-08-06)

- **Always land finished work on `main` so Vercel Production deploys.**
- Branch Previews show **“No target”** and are useless for device QA on `follow-the-crowd.vercel.app`.
- When the task is done and build is green: commit → push branch → fast-forward / merge to **`main`** in the **same turn**. Do not wait for a separate “ship it” unless he said Preview-only or large/risky and needs review first.
- Auto-merge finished small fixes / polish to `main`. Large/risky work may use a PR first; still land on `main` once done.
- **Never force-push `main`.**
- Never update git config. Never skip hooks unless he asks.
- Do not commit secrets (`.env*`, credentials).
- Prefer not committing unrelated dirty files.
- Clear one-line commit messages.
- Cloud Agent branch naming (when in Cursor Cloud): `cursor/<descriptive-name>-XXXX` per environment instructions.

### Debugging

- **After 2 failed fix attempts:** stop guessing. Gather diagnostics (console, network, queries, data flow). Do not guess a third time.
- **Do detective work yourself.** Do not ask Isaac for screenshots/diagnostics as a first resort. Read the code, trace the flow.

### Shipping & perfection

- **Ship for beta, iterate later.** Good enough beats perfect.
- Bias toward launching. Perfectionism is the enemy of progress.

### Code taste

- Small, focused diffs. Match existing patterns.
- FTC flat design: navy surfaces, subtle borders, light-blue primary buttons.
- **No glow** on event artwork tiles, cards, or swatches.
- Optional flyer — never required.
- Next.js 16 may differ from training data — read `node_modules/next/dist/docs/` before assuming APIs.
- Pre-code decision ladder (stop at first that holds):
  1. Need it? → No: skip  
  2. Already in codebase? → Reuse  
  3. Stdlib? → Use it  
  4. Native platform (Next / Supabase / browser)? → Use it  
  5. Installed dependency? → Use it  
  6. One line? → One line  
  7. Only then: minimum that works  
- Reuse-first UI: search for existing components/hooks/`.ftc-*` tokens before inventing a third variant.

### When he says “build, commit, push”

1. `npm run build` (fix failures)  
2. Commit  
3. Push (and merge to `main` per standing rule)  
4. Return commit hash  

### Handoff after every completed task

Update `docs/handoff/` per `HANDOFF-UPDATE.md` (minimum `CURRENT-STATE.md`: date, bullets, recent commits).  
End summary with **Handoff updated:** file list.  
For meaningful UI: include Design System Review fields from `FTC_WORKFLOW.md`.

### Phone / desktop parity (permanent)

Every UI / loading / nav change: verify **~390px** and **~1280px**. Same features, permissions, outcomes. Layout may differ; behaviour must not. (`FTC_WORKFLOW.md` §7 / parity section.)

---

## 4. Stack & architecture essentials

| Layer | Tech |
|-------|------|
| App | Next.js **16** App Router, React 19, TypeScript |
| UI | Tailwind 4 + `app/globals.css` FTC tokens + `docs/design/FTC_DESIGN_SYSTEM.md` |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Realtime, RPC) |
| Hosting | Vercel (production on push to `main`) |
| Tests | `npm run test:regressions`, Playwright e2e (`qa:e2e:prod`) |

### Auth

Auth is **not** in Next middleware. `middleware.ts` only redirects preview hosts to the canonical production host. Authenticated pages use **`OnboardingGuard`**.

### Data

Heavy RLS. Never weaken policies casually. Isaac applies migrations by pasting `supabase/migrations/*.sql` (or `scripts/*.sql`) into the SQL Editor.  
**Do not assume SQL ran** unless he says so.

Manual scripts that often still need applying (verify with Isaac / CURRENT-STATE):

- `scripts/setupBookingRequestsRealtime.sql`
- `scripts/fixCreateNotification.sql` (create_notification overload / notify delivery)

### Messaging (high fragility)

DMs are a major surface — inbox + conversation, bookings-in-chat, reactions, attachments, scroll pinning, iOS keyboard. Prefer reading existing `lib/dm/*`, `lib/useChatScroll.ts`, `app/dm/**` before changing anything.

**Realtime caveats (hard-won):**

- `message_attachments` is **not** in realtime publication — live images use a bounded select + short retry, not polling
- Reaction DELETE `payload.old` often has **only** the reaction `id` — resolve context from local state
- Do not add polling / arbitrary timer loops for realtime gaps unless matching an existing bounded one-shot pattern

**Chat scroll:** prefer container `scrollTop` math; avoid `scrollIntoView` on return paths (breaks iOS fixed chat shell).

**Caches:** Many sessionStorage / localStorage caches (events list, calendars, nav badges, DM scroll). Ungated consumes cause UX bugs.

### Permanent product rules

1. One primary home for each piece of information  
2. Workflow before features  
3. Mature interaction patterns first (IG, WhatsApp, iMessage, Discord, Telegram)  
4. **Preserve context** — Back restores origin, tabs, filters, conversation  
5. Realtime must be trustworthy — no hard-refresh culture  
6. Avoid over-engineering — smallest correct solution  
7. Investigate after repeated failure  
8. No feature creep before beta — roadmap ideas stay on the roadmap  

### Navigation / context traps (frequent bugs)

- Dropping `from=`, `returnTo`, `eventReturn`, `dmConversation`, `profileFrom`, `profileReturnTo` on Back  
- Crew chat Back rebuilding DM without `profileFrom` / `profileReturnTo` → bare profile (no Back, **Message / Book DJ**)  
- Badge bus (`ftc-notifications-updated`) hard-reloading Crew Chats and treating empty as still-loading → skeleton ↔ empty flicker  
- Testing a branch Preview (“No target”) instead of Production  

Deep technical patterns: `CLAUDE-IMPLEMENTATION-HANDOVER.md`.

---

## 5. Main routes

| Route | Purpose |
|-------|---------|
| `/` | Splash → role default (`/events` or `/dm`) |
| `/login` `/signup` `/onboarding` `/profile/setup` | Auth funnel |
| `/events` | Active / History (planner workspace) |
| `/booking-plans` | Saved Event Plans |
| `/calendar` | Events + Gigs calendar modes |
| `/bookings` | Gigs Incoming / Confirmed / History (DJ) |
| `/events/[eventId]` | Event Details (bookings, run sheet, cancel, etc.) |
| `/events/[eventId]/chat` | **Crew chat** (UI says Crew; code may still say group) |
| `/dm` | Messages inbox (`?tab=group` = Crew Chats) |
| `/dm/[conversationId]` | DM thread (+ booking cards) |
| `/profile/[userId]` | Profiles |
| `/settings` `/notifications` | Account / alerts |
| `/discover` | **Retired** — redirects by role |

Workspace group `app/(planner-workspace)/` keeps Events / Event Plans / Calendar / Gigs chrome mounted across those tabs.

### Key files map

| Need | Open |
|------|------|
| What’s built | `docs/handoff/CURRENT-STATE.md` |
| Brand / feature gate | `docs/handoff/BRAND-PHILOSOPHY.md` |
| Product stage / metrics | `docs/handoff/PRODUCT-HANDOVER.md` |
| Isaac taste | `docs/handoff/USER-PREFERENCES.md` |
| Roles | `docs/handoff/HOW-WE-WORK.md` |
| Multi-agent | `docs/handoff/MULTI-AGENT-WORKFLOW.md` |
| Ship docs checklist | `docs/handoff/HANDOFF-UPDATE.md` |
| Stack / folders | `docs/handoff/PROJECT.md` |
| SQL | `docs/handoff/SUPABASE.md`, `supabase/migrations/`, `scripts/*.sql` |
| Secrets pointers (no values) | `docs/handoff/SECRETS.md` |
| Design | `docs/design/FTC_DESIGN_SYSTEM.md`, `lib/design/*` |
| Beta / QA | `docs/qa/` |
| DM conversation | `app/dm/[conversationId]/page.tsx`, `lib/dm/*`, `lib/useChatScroll.ts` |
| DM inbox | `app/dm/page.tsx`, `lib/dmInbox.ts`, `lib/groupChats.ts` |
| Bookings in chat | `app/components/BookingRequestCard.tsx`, `lib/bookingRequests.ts` |
| Events | `lib/events.ts`, `app/events/**` |
| Run sheet | `app/components/EventRunSheetSection.tsx` |
| Crew chat | `app/events/[eventId]/chat/page.tsx`, `lib/eventCrewChat.ts` |
| Profile nav context | `lib/profileNavigation.ts`, `lib/dm/threadNavigation.ts` |
| Auth gate | `app/components/OnboardingGuard.tsx`, `lib/user/currentUser.ts` |
| Nav badges | `app/components/navigation/NavBadgeProvider.tsx`, `lib/notifications.ts` |

---

## 6. Design language

- Flat dark navy, subtle borders, solid accents  
- Light-blue / cyan primary CTAs  
- **No** neon, glow, purple-gradient “AI look,” cyberpunk styling  
- **No** raw UUIDs in UI  
- Status badges via shared FTC status helpers  
- Flyer optional; fallback colour tiles when no cover  
- Source: `docs/design/FTC_DESIGN_SYSTEM.md` + `.ftc-*` classes  

UI terminology (locked): prefer **Crew chat / Crew Chats** in user-facing copy (code may still say group chat).

---

## 7. Builder operating rules (non-negotiable)

1. **Investigate before changing.** Read relevant code + CURRENT-STATE.  
2. **One approved task at a time.**  
3. **Preserve behaviour** — booking, DM, crew chat, RLS, rate proposals must not regress.  
4. **No raw UUIDs in UI.**  
5. **Do not duplicate** booking or chat logic — extend shared modules.  
6. **Do not add polling / arbitrary timer loops** unless matching an existing bounded pattern.  
7. **Chat scroll:** container `scrollTop`; avoid `scrollIntoView` on return paths.  
8. **Do not change Supabase SQL** unless the task requests SQL. Creating a migration ≠ applying it.  
9. **Secrets:** never put real keys in handoff docs.  
10. **Ship to `main`** when done (see §3).  
11. **Update handoff** when done.  
12. **End formal tasks** with FTC_WORKFLOW fields (below).  

### Testing & ship checklist

```bash
npm run build                 # required before commit on code tasks
npm run test:regressions      # when touching covered helpers
npm run lint                  # if relevant
npm run dev                   # local
```

UI / nav / loading: ~390px + ~1280px behavioural check.

Messaging regression ideas: inbox → latest; leave/reopen; profile Back restores scroll; booking-target Back; live pin at bottom; images / reactions / inbox preview; Crew Chats tab stable (no skeleton flicker).

E2E: `npm run qa:e2e:prod` hits production WebKit — needs credentials; not a substitute for local build.  
QA reset: `npm run qa:reset` — QA accounts only.

### Response format Isaac expects

Keep it short. For formal Builder tasks include:

| Field | Meaning |
|-------|---------|
| **Task** | What this turn did |
| **Files inspected/changed** | Paths |
| **What was not changed** | Scope left alone |
| **Risks or blockers** | Security, UX, SQL not run, etc. |
| **Next action** | Isaac / Builder / QA |
| **Handoff updated** | Which `docs/handoff/` files |

If commit/push: include **commit hash** and note Production via `main`.

For meaningful UI also: Existing FTC patterns reused + Design System Review.

---

## 8. Current product status (verify against CURRENT-STATE)

| Item | Status |
|------|--------|
| Coached private beta GO | Yes (2026-07-16) |
| App version | `0.9.0` |
| Deploy preference | Always Production via `main` |
| Communication | Brutal honesty locked |

Recent hard-won fixes (see CURRENT-STATE for full log — update as you ship):

- Crew Chats skeleton ↔ empty flicker (badge bus + empty-as-loading)
- Profile → Message → Crew → Back ×2 losing chat context
- Own bubble text `font-medium` (optical weight on cyan)
- Crew chat terminology; View event label restored
- Decline two-tap CONFIRM
- DM peer notify re-resolve; crew chat start notifies inbox live
- Run sheet notify build break (`eventData.name`)
- Booking card: drop Booking type; Cancelled by shows DJ name

### Outstanding / verify with Isaac

- Some SQL scripts may still need applying in Supabase (Realtime publication, `create_notification`)
- DJ already-booked for cancelled events fix may sit on a Claude branch — check CURRENT-STATE  
- `KNOWN-ISSUES.md` can be stale — verify before treating as open  

---

## 9. Common mistakes (avoid)

1. Coding before reading CURRENT-STATE + existing implementation  
2. Large refactors of `app/dm/[conversationId]/page.tsx` or `lib/bookingRequests.ts` during polish  
3. Second inbox preview formatter or hardcoding preview strings in the page  
4. `scrollIntoView` / timer hacks for chat scroll  
5. Assuming Realtime DELETE payloads include full rows  
6. Remounting planner workspace chrome inside `loading.tsx`  
7. Leaving finished work on a Preview-only branch  
8. Claiming SQL is applied  
9. Long reports when Isaac wanted a short status  
10. Shortening **View event** → **View** (looks empty on full-width primary)  
11. Hiding Message on profiles just because of deep stack ancestry (hide only when opened from that same DM)  
12. Always notifying badge bus on zero-row mark-read updates  
13. Fighting another agent’s worktree / stashing shared trees  
14. Feature creep from promoter interviews (tickets/ads/accounting) before the ops loop is sticky  

---

## 10. Roadmap layers (do not build ahead of beta)

| Phase | Focus |
|-------|--------|
| **1 (now)** | Workflow indispensable — events, bookings, DMs, crew chat, run sheet, calendars |
| **2** | Workforce beyond DJs — only when users repeatedly ask |
| **3+** | Ops depth, professional network, content, fans, creator economy — later |

Detail: `PRODUCT-HANDOVER.md` + `PRODUCT-VISION.md`. Brand gate wins on priority conflicts.

---

## 11. Related handoff index

| File | Use |
|------|-----|
| **`CLAUDE-FULL-HANDOVER.md`** | **This file — start here for Claude** |
| `CLAUDE-CODE-BUILDER-HANDOVER.md` | Older Builder paste (partially superseded by this file) |
| `CLAUDE-IMPLEMENTATION-HANDOVER.md` | Deep technical architecture / debt / DM patterns |
| `CURRENT-STATE.md` | What’s shipped — update every ship |
| `BRAND-PHILOSOPHY.md` | Mission / enemy / feature gate |
| `PRODUCT-HANDOVER.md` | Day-one product/strategy |
| `PRODUCT-VISION.md` | Roadmap / GTM / revenue depth |
| `USER-PREFERENCES.md` | Isaac’s working style |
| `HOW-WE-WORK.md` | Short roles |
| `MULTI-AGENT-WORKFLOW.md` | Worktrees / collision rules |
| `PROJECT.md` | Stack / folders |
| `SUPABASE.md` / `SECRETS.md` | SQL + credential pointers |
| `HANDOFF-UPDATE.md` | What to update when shipping |
| `START-HERE-CURSOR.md` | Cursor chat paste |
| `START-HERE-GPT.md` | Legacy ChatGPT — not live partner |
| `docs/qa/` | Beta readiness, known issues, tester onboarding |

---

## 12. Quick commands

```bash
cd /Users/isaaccunningham/Projects/FTC   # or cloud workspace /workspace
git status
git log -15 --oneline
npm run build
npm run test:regressions
npm run dev
```

Worktrees (multi-agent):

```bash
scripts/ftc-worktree.sh new <task-name>
scripts/ftc-worktree.sh list
```

---

**End of full Claude handover.**  
Isaac: paste the start block in §0 + your task.  
Claude: read this, verify against code + CURRENT-STATE, ship one thing cleanly to Production via `main`, update handoff, keep the answer short.
