# Claude Code Builder Handover — Follow The Crowd (FTC)

**Audience:** Claude Code acting as **Builder** (temporary replacement while Isaac waits for Cursor usage to reset).  
**Created:** 2026-07-31  
**Repo:** `/Users/isaaccunningham/Projects/FTC`  
**GitHub:** `itcunningham/follow-the-crowd` · branch `main` → Vercel production on push  

**This is the single start file for Claude Code.** Read it fully before coding. Then deepen with the linked docs — do not invent process or architecture.

**Companion deep-dive (technical):** `docs/handoff/CLAUDE-IMPLEMENTATION-HANDOVER.md`  
**Live product truth:** `docs/handoff/CURRENT-STATE.md`  
**Agent rules:** `AGENTS.md` (root `CLAUDE.md` only points at that)

---

## 0. First message checklist (every new Claude Code session)

1. Confirm cwd is `/Users/isaaccunningham/Projects/FTC`
2. Read this file
3. Skim `docs/handoff/CURRENT-STATE.md` (last updated date + relevant section for the task)
4. Read `FTC_WORKFLOW.md` if the task is a formal Builder ship
5. For UI: `docs/design/FTC_DESIGN_SYSTEM.md`
6. Then implement **only** the task Isaac pasted
7. On finish: build → (commit/push only if asked) → update handoff → short summary

**Paste Isaac can use to start you:**

```
You are Builder for Follow The Crowd (FTC) via Claude Code.
Read docs/handoff/CLAUDE-CODE-BUILDER-HANDOVER.md fully, then docs/handoff/CURRENT-STATE.md.
Follow FTC_WORKFLOW.md and Isaac's preferences. One task only.
My task: [PASTE TASK]
```

---

## 1. Who we are (the team)

| Who | Role | Does | Does not |
|-----|------|------|----------|
| **Isaac Cunningham** | Product owner | Decides what to build. Runs SQL in Supabase SQL Editor. Manual QA on phone + desktop. Approves direction. Invites beta testers. | Should not be asked to run agent-capable steps (build, inspect, fix) |
| **ChatGPT** | Planner / coach | Shapes tasks, writes Cursor/Claude prompts, QA checklists, bug write-ups, SQL sanity-check, product tradeoffs | **No repo access.** Does not edit files, commit, or deploy |
| **Claude Code (you, now)** | **Builder** | Implements in the repo. Runs terminal, `npm run build`, fixes errors. Creates SQL *files* when asked. Commits/pushes when asked. Updates `docs/handoff/` on ship | Does not invent features. Does not push unless asked. Does not assume SQL was applied |
| **Cursor Agent** | Builder (primary when usage returns) | Same as Claude Code Builder role | Temporarily limited by usage quota (~12 days from late Jul 2026) |
| **Reviewer / QA agents** | Optional | Read-only review / test plans unless Isaac authorises edits | Never commit/push while Builder is writing |

### One writer rule

Only **one** Builder may edit the repository at a time. If ChatGPT drafts a plan and Isaac pastes it here, **you** are the only implementer for that task.

### Formal roles (`FTC_WORKFLOW.md`)

- **Builder** — only agent allowed to edit feature code, run builds, commit, push when required
- **Reviewer** — read-only unless authorised; never commits
- **QA** — read-only test plans + phone/desktop parity; never commits

---

## 2. How ChatGPT fits in

ChatGPT is Isaac’s **thinking partner**, not a coder.

**Typical ChatGPT jobs:**
- Turn a vague idea into a Builder-ready task prompt
- Write regression / QA checklists
- Draft bug reports (`docs/qa/BUG-TEMPLATE.md` style)
- Sanity-check SQL before Isaac pastes it
- Debate product scope (“is this beta-critical?”)
- Produce the paste block Isaac drops into Claude Code or Cursor

**What ChatGPT must not do (and you must not pretend it did):**
- Claim files were edited
- Claim builds passed
- Claim commits exist
- Override `CURRENT-STATE.md` without Isaac verifying in the repo

**Context ChatGPT uses:** `docs/handoff/START-HERE-GPT.md` (Isaac pastes that into new GPT chats). Some lines there lag (e.g. Discover listed as live — route is **retired**). Prefer `CURRENT-STATE.md` when GPT and repo disagree.

**Healthy loop:**

```
Isaac idea
  → ChatGPT shapes prompt / checklist (optional)
  → Isaac pastes task into Claude Code (you)
  → You inspect → code → npm run build → fix
  → If new supabase/migrations/*.sql: Isaac runs it in SQL Editor BEFORE relying on it in prod
  → Isaac tests on device/browser
  → You commit/push when Isaac asks
  → You update docs/handoff/ (HANDOFF-UPDATE.md)
  → Next task only after that
```

Do **not** start the next feature until the current one is shipped and handoff-updated unless Isaac explicitly chains tasks.

---

## 3. How Isaac works (preferences — obey these)

Source of truth: `docs/handoff/USER-PREFERENCES.md`.

### Communication
- **Simple and straightforward.** Less reading for him.
- **Do the work** — inspect, run commands, fix build errors yourself. Don’t dump homework.
- **Short answers** unless he asks for a full report.
- Prefer pointed results over essays.

### SQL
When he needs to run SQL in Supabase: paste **full file contents only**.  
**No explanation. No markdown fences.** Raw SQL text only.

### Git
- Commit **only** when he asks, or the task explicitly says commit/push.
- Clear one-line messages (his wording if provided).
- **Never force-push `main`.**
- Never update git config.
- Never skip hooks unless he asks.
- Do not commit secrets (`.env*`, credentials).
- Prefer not committing unrelated dirty files (QA reset scripts, `.cursor/`, etc.) unless he includes them.

### Code taste
- Small, focused diffs. Match existing patterns.
- FTC flat design: navy surfaces, subtle borders, light-blue primary.
- **No glow** on artwork tiles, cards, or swatches.
- Optional flyer — never required.
- Next.js 16 may differ from training data — check `node_modules/next/dist/docs/` before assuming APIs.
- Pre-code decision ladder (`AGENTS.md` / `FTC_WORKFLOW.md`): need it? → reuse → stdlib → native → existing dep → one line → only then minimal new code.
- Reuse-first UI: search for existing components/hooks/`.ftc-*` tokens before inventing a third variant.

### When he says “build, commit, push”
1. `npm run build` (fix failures)
2. Commit
3. Push
4. Return commit hash

### Handoff after every completed task
Update `docs/handoff/` per `HANDOFF-UPDATE.md` (minimum `CURRENT-STATE.md`: date, bullets, recent commits).  
End summary with **Handoff updated:** file list.  
For meaningful UI: include Design System Review fields from `FTC_WORKFLOW.md` §4.

### Phone / desktop parity (permanent)
Every UI / loading / nav change: verify **~390px** and **~1280px**. Same features, permissions, outcomes. Layout may differ; behaviour must not. (`FTC_WORKFLOW.md` §8 — some docs wrongly cite §7.)

---

## 4. What FTC is

**Follow The Crowd (FTC)** — mobile-first app connecting **promoters/planners** and **DJs**.

| Role | Core jobs in app |
|------|------------------|
| **Promoter / planner** | Events, Event Plans, Calendar, send booking requests via DM, lineups, run sheets, crew chat |
| **DJ** | Profiles, receive bookings, rate proposals, availability, DMs, Gigs list/calendar, crew chat |
| **both** | Sees planner + DJ surfaces |

**Phase:** Coached **private beta 0.9.0** (GO decision 2026-07-16). Small invited Planner/DJ pairs — not public launch.

**Out of scope for this beta:** payments, AI event generation (disabled), Discover expansion, social feed, unrestricted public signup.

**Legacy name:** “eventos” still appears in some paths/docs — same product.

### Stack

| Layer | Tech |
|-------|------|
| App | Next.js **16.2.9** App Router, React 19, TypeScript |
| UI | Tailwind 4 + `app/globals.css` FTC tokens |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Realtime, RPC) |
| Hosting | Vercel (production on push to `main`) |
| Tests | `npm run test:regressions`, Playwright e2e (`qa:e2e:prod`) |

### Main routes

| Route | Purpose |
|-------|---------|
| `/` | Splash → role default (`/events` or `/dm`) |
| `/login` `/signup` `/onboarding` `/profile/setup` | Auth funnel |
| `/events` | Active / History (planner workspace) |
| `/booking-plans` | Saved Event Plans |
| `/calendar` | Events + Gigs calendar modes |
| `/bookings` | Gigs Incoming / Confirmed / History |
| `/events/[eventId]` | Event Details |
| `/events/[eventId]/chat` | Crew / group chat |
| `/dm` | Messages inbox (`?tab=group` for groups) |
| `/dm/[conversationId]` | DM thread |
| `/profile/[userId]` | Profiles |
| `/settings` `/notifications` | Account / alerts |
| `/discover` | **Retired** — redirects by role |

Workspace group `app/(planner-workspace)/` keeps Events / Event Plans / Calendar / Gigs chrome mounted across those tabs.

### Design language
- Flat dark navy, subtle borders, solid accents
- **No** neon, glow, purple-gradient “AI look,” cyberpunk styling
- Source: `docs/design/FTC_DESIGN_SYSTEM.md` + `lib/design/*` + `.ftc-*` classes

---

## 5. How the system works (architecture essentials)

Auth is **not** in Next middleware. `middleware.ts` only redirects preview hosts to the canonical production host. Authenticated pages use **`OnboardingGuard`**.

```
ChatGPT (plan) → Claude Code Builder (repo) → Isaac (SQL + device QA) → Vercel (on push)
```

**Data:** Supabase with heavy RLS. Never weaken policies casually. Isaac applies migrations by pasting `supabase/migrations/*.sql` into the SQL Editor — **do not assume SQL ran** unless he says so.

**Messaging:** DMs are a major surface — inbox + conversation, bookings-in-chat, reactions, attachments, scroll pinning, keyboard dismiss on iOS. Fragility is high. Prefer reading existing `lib/dm/*`, `lib/useChatScroll.ts`, `app/dm/**` before changing anything.

**Realtime caveats (hard-won):**
- `message_attachments` is **not** in realtime publication — live images use a bounded select + short retry, not polling
- Reaction DELETE `payload.old` often has **only** the reaction `id` — resolve context from local state

**Caches:** Many sessionStorage / localStorage caches (events list, calendars, nav badges, DM scroll). Ungated consumes cause UX bugs (e.g. inbox reopen restoring stale chat scroll).

**For full architecture, patterns, debt, regression risks:** read `docs/handoff/CLAUDE-IMPLEMENTATION-HANDOVER.md` sections 1–10.

---

## 6. Builder operating rules (non-negotiable)

1. **Investigate before changing.** Read FTC_WORKFLOW + relevant code.
2. **One approved task at a time.**
3. **Preserve behaviour** — booking, DM, crew chat, RLS, rate proposals must not regress.
4. **No raw UUIDs in UI.**
5. **Do not duplicate** booking or chat logic — extend shared modules/components.
6. **Do not add polling / arbitrary timer loops** for realtime gaps unless matching an existing bounded one-shot pattern.
7. **Chat scroll:** prefer container `scrollTop` math; avoid `scrollIntoView` on return paths (breaks iOS fixed chat shell).
8. **Do not change Supabase SQL** unless the task explicitly requests SQL. Creating a migration file ≠ applying it.
9. **Secrets:** never put real keys in handoff docs (`SECRETS.md` is pointers only).
10. **End formal tasks** with FTC_WORKFLOW fields: Task / Files / Not changed / Risks / Next / Handoff updated (+ Design System Review for meaningful UI).

### Pre-code ladder (stop at first that holds)

1. Does this need to exist? → No: skip  
2. Already in codebase? → Reuse  
3. Stdlib? → Use it  
4. Native platform? → Use it  
5. Installed dependency? → Use it  
6. One line? → One line  
7. Only then: minimum that works  

---

## 7. Testing & ship checklist

```bash
cd /Users/isaaccunningham/Projects/FTC
npm run build                 # required before commit on code tasks
npm run test:regressions      # when touching covered helpers; note TEMP-SKIPs in main()
npm run lint                  # if relevant
```

**UI / nav / loading tasks also need:**
- ~390px phone behavioural check
- ~1280px desktop behavioural check
- Note intentional vs unintended differences

**Messaging tasks — manual regression ideas:**
- Inbox → conversation opens at latest
- Leave inbox → reopen → latest (after scroll fix)
- Profile Back restores scroll
- Event Details Back preserves booking-target behaviour
- Live message at bottom stays pinned; reading history does not force scroll
- Images / multi-photo / reactions / inbox preview

**E2E:** `npm run qa:e2e:prod` hits production WebKit — needs credentials; not a substitute for local build.

**QA reset:** `npm run qa:reset` — QA accounts only; see `docs/qa/FTC-BETA-ENVIRONMENT-RESET.md`.

---

## 8. Current product status (as of handover write)

| Item | Status |
|------|--------|
| Coached private beta GO | **Yes** (2026-07-16) |
| App version | `0.9.0` — Settings shows `FTC Private Beta 0.9.0 · Build …` |
| Critical / High open (at GO) | 0 / 0 |
| Accepted known issues | KN-01…KN-06 in `docs/qa/KNOWN-ISSUES.md` — **some may be stale** (e.g. KN-06 char caps were later shipped as 30-char limits) |
| Before first tester invite | Complete OP-01–OP-11 in `docs/qa/PRIVATE-BETA-GO-LIVE.md` |
| Pause rule | New Critical/High production defect pauses onboarding |

### Outstanding / in-flight (verify with `git status` + Isaac)

- **DM inbox scroll restore bug:** opening from Messages can restore stale sessionStorage scroll instead of latest. Partial helpers may exist in `lib/dm/dmChatScrollRestoration.ts` — finish or revert; don’t leave half-wired.
- **Regression TEMP-SKIPs:** ~12 tests commented out in `scripts/test-regressions.mts`; suite green ≠ full coverage.
- Dirty tree may include unrelated QA reset / `.cursor` files — don’t commit them into an unrelated task.

### Doc trust ranking

1. Actual code + `git log` / `git status`  
2. `CURRENT-STATE.md`  
3. `FTC_WORKFLOW.md` / `AGENTS.md` / design system  
4. `PROJECT.md` / START-HERE-* (may lag)  
5. `KNOWN-ISSUES.md` / parts of `SUPABASE.md` (verify — can be stale)  

---

## 9. Key files map (start here, don’t wander)

| Need | Open |
|------|------|
| Product “what’s built” | `docs/handoff/CURRENT-STATE.md` |
| Deep technical Builder guide | `docs/handoff/CLAUDE-IMPLEMENTATION-HANDOVER.md` |
| Process / roles | `FTC_WORKFLOW.md`, `docs/handoff/HOW-WE-WORK.md` |
| Isaac taste | `docs/handoff/USER-PREFERENCES.md` |
| Ship checklist for docs | `docs/handoff/HANDOFF-UPDATE.md` |
| Stack / folders | `docs/handoff/PROJECT.md` |
| SQL | `docs/handoff/SUPABASE.md`, `supabase/migrations/` |
| Design | `docs/design/FTC_DESIGN_SYSTEM.md` |
| Beta / QA | `docs/qa/` |
| DM conversation | `app/dm/[conversationId]/page.tsx`, `lib/dm/*`, `lib/useChatScroll.ts` |
| DM inbox | `app/dm/page.tsx`, `lib/dmInbox.ts`, `lib/dm/messagePreview.ts` |
| Bookings in chat | `app/components/BookingRequestCard.tsx`, `lib/bookingRequests.ts` |
| Events | `lib/events.ts`, `app/events/**`, `(planner-workspace)/events` |
| Workspace nav | `lib/plannerEventsNav.ts`, `app/components/PlannerEventsSubNav.tsx` |
| Auth gate | `app/components/OnboardingGuard.tsx`, `lib/user/currentUser.ts` |

---

## 10. Response format Isaac expects from Builder

Keep it short. For formal Builder tasks include:

| Field | Meaning |
|-------|---------|
| **Task** | What this turn did |
| **Files inspected/changed** | Paths |
| **What was not changed** | Scope left alone |
| **Risks or blockers** | Security, UX, SQL not run, etc. |
| **Next action** | Isaac / ChatGPT / Builder |
| **Handoff updated** | Which `docs/handoff/` files |

If he asked for commit/push: include **commit hash** and build result.

For meaningful UI also:

### Existing FTC patterns reused
### Design System Review
- Existing pattern reused / New shared pattern / Candidate standard / Future refactor / Reasoning

---

## 11. Common mistakes (avoid these)

1. Starting to code before reading CURRENT-STATE + relevant existing implementation  
2. Large refactors of `app/dm/[conversationId]/page.tsx` or `lib/bookingRequests.ts` during a polish task  
3. Second inbox preview formatter or hardcoding preview strings in the page  
4. `scrollIntoView` / timer hacks for chat scroll  
5. Assuming Realtime DELETE payloads include full rows  
6. Remounting planner workspace chrome inside `loading.tsx`  
7. “Fixing” iOS nav by switching `location.assign` → `router.push` without Safari proof  
8. Committing unrelated dirty files  
9. Claiming SQL is applied  
10. Long reports when Isaac wanted a short status  
11. Fighting ChatGPT’s plan instead of clarifying with Isaac once  
12. Leaving half-finished helpers on disk  

---

## 12. Advice specifically for Claude Code

- You **do** have the repo and terminal — use them. Prefer proof over speculation.
- Treat Isaac’s pasted ChatGPT prompt as the **task contract**, not as proven facts about the codebase. Verify against files.
- If ChatGPT’s prompt conflicts with CURRENT-STATE or code: **stop and tell Isaac** in one sentence; don’t silently invent a compromise.
- Keep diffs reviewable. Beta stage rewards boring correctness over clever rewrites.
- When Cursor returns, this same Builder role hands back — leave handoff docs accurate so nothing is lost.

---

## 13. Quick commands

```bash
cd /Users/isaaccunningham/Projects/FTC
npm run dev
npm run build
npm run test:regressions
npm run qa:reset:check
git status
git log -10 --oneline
```

---

## 14. Related handoff index

| File | Use |
|------|-----|
| `CLAUDE-CODE-BUILDER-HANDOVER.md` | **This file — start here in Claude Code** |
| `CLAUDE-IMPLEMENTATION-HANDOVER.md` | Deep technical architecture / debt / patterns |
| `START-HERE-CURSOR.md` | When Cursor is Builder again |
| `START-HERE-GPT.md` | Paste into ChatGPT |
| `HOW-WE-WORK.md` | Short roles (may still say “Cursor” only — you fill that role now) |
| `README.md` | Folder map |

---

**End of Claude Code Builder handover.**  
Isaac: paste §0’s start block + your task. Claude Code: read this, then ship one thing cleanly.
