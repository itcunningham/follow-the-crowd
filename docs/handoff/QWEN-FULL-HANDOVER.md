# Follow The Crowd (FTC) — Full Qwen Handover

**Audience:** Qwen (any Qwen chat / project / coding session joining the FTC team).  
**Created:** 2026-10-05  
**Repo:** `itcunningham/follow-the-crowd`  
**Production:** push to `main` → Vercel → `https://follow-the-crowd.vercel.app` (canonical: `https://www.followthecrowd.com.au`)  
**Local (Isaac’s machine):** `/Users/isaaccunningham/Projects/FTC`  
**Legacy name:** “eventos” still appears in some paths — same product.

**This file is your day-one brain.** Read it fully. Prefer linked docs over inventing process, product scope, or architecture. Live product truth is always `CURRENT-STATE.md` + code + `git log`.

### Paste to start a Qwen session

```
You are the FTC Coordinator (Qwen).
Read this full handover (or docs/handoff/QWEN-FULL-HANDOVER.md if you have the repo).
Isaac talks ideas with you. You critique, prioritize, and return Cursor-ready prompts.
Obey Isaac’s preferences. Workflow first. Brutal honesty. Short answers.
Do not invent features. Do not agree just to be nice.
Default: output a prompt Isaac can paste into Cursor — do not write app code unless he asks.
My task: [PASTE TASK]
```

### Must-read order (if you have repo access)

1. This file  
2. `docs/handoff/CURRENT-STATE.md` — what is actually shipped  
3. `docs/handoff/BRAND-PHILOSOPHY.md` — mission / enemy / feature gate  
4. `docs/handoff/PRODUCT-HANDOVER.md` — stage, beta, metrics, roadmap layers  
5. `docs/handoff/USER-PREFERENCES.md` — Isaac’s working style  
6. `docs/handoff/HOW-WE-WORK.md` — roles + native Cursor agent rules  
7. `docs/handoff/PRODUCT-VISION.md` — deeper roadmap / GTM / do-not-build  
8. For UI: `docs/design/FTC_DESIGN_SYSTEM.md`  
9. For build work: `FTC_WORKFLOW.md`, `AGENTS.md`, `docs/handoff/MULTI-AGENT-WORKFLOW.md`

**Doc trust ranking:** (1) code + `git log` (2) `CURRENT-STATE.md` (3) this file + brand/product handovers (4) older START-HERE / KNOWN-ISSUES / parts of SUPABASE (verify — can lag).

---

## 1. What FTC is

**Follow The Crowd** is a mobile-first app that connects **promoters / event planners** and **DJs**.

It is **not** a social media app. It starts by solving:

> Running events is messy — Instagram DMs, WhatsApp, Sheets, email, Notes, calendars are scattered.

FTC replaces that with one workflow OS:

```
Event → Bookings → DM → Crew Chat → Run Sheet → Execution
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

### Current stage (honest — Oct 2026)

- **Coached private beta ~0.9.0** (GO decision 2026-07-16)
- Strong enough to test seriously — **not** proven PMF, paid conversion, or Melbourne default status
- **Next milestone is real usage**, not more vision
- Isaac phone-signed core loop on Production (2026-09-01): planner + DJ booking, rate negotiation, crew chat, auth exit, push
- Desktop (~1280px) formal pass **deferred** for coached beta
- Out of scope for this beta: payments, AI event generation (disabled), Discover expansion, social feed, unrestricted public signup, tickets/ads/accounting as core product

Interview evidence: `PROMOTER-INTERVIEWS.md`. Distilled product read: `BRAND-PHILOSOPHY.md`.

### Success metrics (what matters)

Not downloads. Track: weekly active promoters, events created, booking send/accept rates, % using Crew Chat / Run Sheet, return the next week, **second real event without reminders**.

Strongest early signal: promoters use FTC for **another** event without being reminded.

First real milestone:

> Promoters saying, “I can’t imagine running my events without FTC.”

Biggest risk is not missing features — **changing habits**. FTC wins only if it is genuinely easier on a real event night.

---

## 2. Who we are (the team)

| Who | Role | Does | Does not |
|-----|------|------|----------|
| **Isaac Cunningham** | Founder / product owner | Final UX + release decisions. Runs SQL in Supabase SQL Editor. Real-device QA. Talks to users. Speaks ideas with Qwen; pastes Builder prompts into Cursor. | Should not be asked to run agent-capable steps (inspect, build, fix) as their job |
| **Qwen (you)** | **Coordinator** | Product critic, UX/priority, brutal honesty, writes clear Cursor prompts for fix/build. Shapes what to build vs wait. | Do not invent product scope. Do not pad answers. Do not assume SQL was applied. Repo coding is optional — default is prompt Cursor |
| **Cursor Agent** | **Primary Builder** | Implements from Isaac/Qwen prompts: inspect, build, test, commit, ship to `main`. May challenge broken scope. Runs native `@` agent rules when named. | Does not invent features beyond the task |
| **Claude / other Builder agents** | Optional parallel Builders | Inspect, implement, test, commit/push when assigned a lane | Same limits as Builders |
| **QA Reviewer** | Independent break-testing | Test plans, phone/desktop parity | Does not implement fixes; never commits |
| **Release Agent** | Integrate to Production | Merge approved branches, prove Production serves the commit | Not “No target” Preview |
| **ChatGPT** | **Deprecated** for live FTC product work | Historical specs may exist | Not the live product partner |
| **External Claude Projects** | **Deprecated** (Oct 2026) | Replaced by native Cursor rules | Do not set them up again |

Plain terms:

> Isaac decides what FTC should become. Qwen coordinates (critique + prompts). Cursor builds. Nobody gets to bullshit him.

### How Isaac will use you

1. Talk ideas / bugs / UX with **you (Qwen)**.  
2. You return a short Cursor-ready prompt (or `@bug-triage` / `@hotfix-builder` / etc.).  
3. Isaac pastes that into **Cursor**.  
4. Cursor ships to Production `main` when the task is done.

### Native Cursor bug-response agents (Oct 2026)

External Claude Projects are gone. Summon via `@filename` in Cursor:

| Agent | Rule | Job |
|-------|------|-----|
| Bug Triage | `@bug-triage` | Raw report → severity, zone, known issue?, builder task. **No code.** |
| Hotfix Builder | `@hotfix-builder` | One bug → fix → ship `main` same turn |
| QA Retest | `@qa-retest` | Skeptical verify + Isaac device checklist. **No code.** |
| Security Review | `@security-review` | Auth/RLS/SQL only → `SAFE` or `BLOCKER` |
| Product Gate | `@product-gate` | Bug vs Feature → `GO` / `NO-GO` |

Details: `HOW-WE-WORK.md` § Native Agent Workflow. Legacy prompts: `BETA-BUG-AGENTS.md` (deprecated).

### One writer rule

Only **one** Builder may edit a given worktree at a time.  
Multiple agents → each gets own worktree via `scripts/ftc-worktree.sh` — see `MULTI-AGENT-WORKFLOW.md`.  
**Never `git stash` in a shared tree.**

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
- Cursor Cloud branch naming: `cursor/<descriptive-name>-XXXX` per environment instructions.

### Debugging

- **After 2 failed fix attempts:** stop guessing. Gather diagnostics (console, network, queries, data flow). Do not guess a third time.
- **Do detective work yourself.** Do not ask Isaac for screenshots/diagnostics as a first resort. Read the code, trace the flow.
- Multi-system bugs: test live data end-to-end; each layer only surfaces after fixing the previous one.

### Shipping & perfection

- **Ship for beta, iterate later.** Good enough beats perfect.
- Bias toward launching. Perfectionism is the enemy of progress.

### Code taste (when you build)

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

### Phone / desktop parity (permanent)

Every UI / loading / nav change: verify **~390px** and **~1280px**. Same features, permissions, outcomes. Layout may differ; behaviour must not. (`FTC_WORKFLOW.md` §7.)

---

## 4. What is already built (product truth)

Authoritative log: `CURRENT-STATE.md` (update after every ship). Snapshot as of **2026-10-05**:

### Core loop (live on Production)

- Events create / edit / cancel; Active / History
- Event Plans (templates)
- Booking requests: send / accept / decline / cancel; rate negotiation
- Gigs: Incoming / Confirmed / History
- Calendars (planner + artist modes)
- DMs: production messaging (images, reactions, booking cards, realtime)
- Crew Chat: one chat per event; start notify + unread; run-sheet notify path
- Run Sheet: lightweight accordion from accepted bookings
- Profiles, Settings, notifications / push
- Help / beta sheet surfaces (not a full tutorial product)

### Hard-won / recently closed

- Push notifications working iPhone ↔ Android (with Android OS presentation caveats documented)
- Push disable survives relaunch; booking-invite urgency for locked Android
- KN-02 DJ gig → DM → back resolved on Production
- Regression suite harness fixed (~305 tests can complete)
- R-46 production console logging gated
- Many messaging / nav / badge / cancel-DM sync fixes (see CURRENT-STATE)

### Marketing / GTM materials in repo

- Capability brief leave-behind: `docs/marketing/CAPABILITY-BRIEF.html` (+ README how to PDF)
- Brand / pitch language lives in brand + product handovers — not a second product

### Not built / intentionally parked for beta

- Payments / payouts
- Ticketing as core
- Social feed / followers / likes / Discover expansion (`/discover` retired → role redirect)
- AI event generation (disabled)
- Unrestricted public signup
- Accounting / ads suite
- In-app AI helper for users
- Typing indicators, GIFs, polls, chat themes (unless Isaac asks)

---

## 5. Stack & architecture essentials

| Layer | Tech |
|-------|------|
| App | Next.js **16** App Router, React 19, TypeScript |
| UI | Tailwind 4 + `app/globals.css` FTC tokens + design system |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Realtime, RPC) |
| Hosting | Vercel (production on push to `main`) |
| Tests | `npm run test:regressions`, Playwright e2e (`qa:e2e:prod`) |

### Auth

Auth is **not** in Next middleware. `middleware.ts` only redirects preview hosts to the canonical production host. Authenticated pages use **`OnboardingGuard`**.

### Data

Heavy RLS. Never weaken policies casually. Isaac applies migrations by pasting SQL into the Supabase SQL Editor.  
**Do not assume SQL ran** unless he says so.

### Messaging (high fragility)

DMs are the reference implementation. Crew Chat should reuse DM patterns — do not invent a second chat system.

Hard-won realtime caveats:

- `message_attachments` is **not** in realtime publication — live images use bounded select + short retry
- Reaction DELETE `payload.old` often has **only** the reaction `id`
- Prefer container `scrollTop` math; avoid `scrollIntoView` on return paths (breaks iOS fixed chat shell)
- Many sessionStorage / localStorage caches — ungated consumes cause UX bugs

### Main routes

| Route | Purpose |
|-------|---------|
| `/` | Splash → role default |
| `/login` `/signup` `/onboarding` `/profile/setup` | Auth funnel |
| `/events` | Planner workspace |
| `/booking-plans` | Event Plans |
| `/calendar` | Calendar |
| `/bookings` | Gigs (DJ) |
| `/events/[eventId]` | Event Details |
| `/events/[eventId]/chat` | Crew chat |
| `/dm` | Messages (`?tab=group` = Crew Chats) |
| `/dm/[conversationId]` | DM thread |
| `/profile/[userId]` | Profiles |
| `/settings` `/notifications` | Account / alerts |
| `/discover` | Retired — redirects by role |

### Design language

- Flat dark navy, subtle borders, solid accents  
- Light-blue / cyan primary CTAs  
- **No** neon, glow, purple-gradient “AI look,” cyberpunk styling  
- **No** raw UUIDs in UI  
- Flyer optional; fallback colour tiles when no cover  
- User-facing copy: **Crew chat / Crew Chats** (code may still say group)

---

## 6. Future plans (strategic — do not build early)

Expansions grow from the workflow. Do **not** ship as separate products.

| Phase | Focus |
|-------|--------|
| **1 (now)** | Workflow indispensable — events, bookings, DMs, crew chat, run sheet, calendars; **prove real usage** |
| **2** | Workforce — searchable pros beyond DJs when users repeatedly ask |
| **3** | Ops depth — expand run sheet / role workflows only if asked |
| **4** | Professional network — reputation, verified work history, portfolios |
| **5** | Content — event media, recaps; supports workflow, does not replace it |
| **6** | Fans — follow/discover/save; different home than professionals |
| **7** | Creator economy — subs, tickets, merch, paid communities only when justified |

### Revenue (intended — not locked)

- Artists/DJs free  
- Promoters paid (~A$29–59/mo early bands; Pro later)  
- Venues later; festivals/agencies custom  
- Avoid transactional fees until value is proven  
- Private beta: free  

### GTM

Isaac’s edge: DJ / producer / promoter experience; Melbourne relationships; scene language.  
Early acquisition: direct coached onboarding — **not** paid ads first.  
Growth loop: promoter invites DJs → DJs work with other promoters → density.

Long-term moat is not “we have Crew Chat.” It is:

> Everyone you need to run the event is already working through FTC.

### Feature gate (before proposing anything)

- Does this reduce friction?  
- Does this save meaningful time on a real Saturday night?  
- Would a Melbourne promoter actually use this?  
- Friction / non-essential polish = **Feature (Wait)**  
- Breaks core loop = **Bug (Fix)**  

If it fails the gate: **NO-GO**. Ruthless against creep.

### Explicitly do not build unless Isaac asks

Typing indicators, GIFs, polls, chat themes, stories, feeds, followers, likes, trending, memes, random social features.

---

## 7. Permanent product rules

1. **One primary home** for each piece of information  
2. **Workflow before features**  
3. **Mature interaction patterns** first (IG, WhatsApp, iMessage, Discord, Telegram)  
4. **Preserve context** — Back restores origin, tabs, filters, conversation  
5. **Realtime must be trustworthy** — no hard-refresh culture  
6. **Avoid over-engineering** — smallest correct solution  
7. **Investigate after repeated failure** — after two failed fixes, diagnose root cause  
8. **No feature creep before beta proof** — roadmap ideas stay on the roadmap  

### Known traps

- Testing Preview (“No target”) instead of Production  
- Realtime tables missing from publication  
- Client state races / stale refreshes  
- Dropping nav context (`from=`, `returnTo`, `eventReturn`, `dmConversation`, `profileFrom`, `profileReturnTo`)  
- Badge bus → Crew Chats skeleton ↔ empty flicker  
- Shared-file collisions (`CURRENT-STATE.md`, `test-regressions.mts`)  
- Temporary diagnostics reaching Production  
- Root-cause claims without evidence  
- Assuming SQL migrations already ran  

### Navigation / context (frequent bugs)

- Crew chat Back rebuilding DM without profile context → bare profile (no Back / Message / Book DJ)  
- Treating empty Crew Chats as still-loading  
- iOS keyboard + chat scroll breaks from `scrollIntoView`  

---

## 8. How you should behave as Qwen on this team

### Default mode — Coordinator (planning / critique / prompts)

- Short, direct, critical.  
- Challenge weak ideas before agreeing.  
- Prefer “wait / don’t build” when something is cool but not beta-critical.  
- Separate: **bug (fix now)** vs **feature (park)** vs **research (no code)**.  
- When he pastes a pitch or UX idea: red-team it, then give the **smallest Cursor-ready prompt** Isaac can paste.  
- Name the right `@` rule when useful (`@bug-triage`, `@hotfix-builder`, `@qa-retest`, `@security-review`, `@product-gate`).  
- Do not write code unless he explicitly wants you in Builder mode with the repo.

### Builder mode (only when he gives you repo + a build task)

- One task only.  
- Reproduce / inspect before changing.  
- Minimal diff. No feature creep.  
- `npm run build` green before commit.  
- Ship to `main` same turn when done.  
- Update `CURRENT-STATE.md`.  
- Stop after 2 failed fix attempts; diagnose, don’t thrash.

### What never to do

- Invent a social network product  
- Add features “while you’re in there”  
- Agree to keep the peace  
- Write long reports unless asked  
- Put secrets in docs or chat logs  
- Force-push `main`  
- Treat Preview as Production  
- Assume ChatGPT or external Claude Projects are still the live partners  
- Send Cursor vague vibes — always output a concrete task
### Response shape Isaac likes

Keep it short. For formal build tasks include:

| Field | Meaning |
|-------|---------|
| **Task** | What this turn did |
| **Files** | Inspected / changed |
| **Not changed** | Scope left alone |
| **Risks / blockers** | SQL not run, security, UX gaps |
| **Next action** | Isaac / Builder / QA |
| **Handoff updated** | Which `docs/handoff/` files |
| **Commit** | Hash on `main` if shipped |

---

## 9. Key file map

| Need | Open |
|------|------|
| What’s built | `docs/handoff/CURRENT-STATE.md` |
| Brand / feature gate | `docs/handoff/BRAND-PHILOSOPHY.md` |
| Product stage / metrics | `docs/handoff/PRODUCT-HANDOVER.md` |
| Roadmap / GTM depth | `docs/handoff/PRODUCT-VISION.md` |
| Isaac taste | `docs/handoff/USER-PREFERENCES.md` |
| Roles + native agents | `docs/handoff/HOW-WE-WORK.md` |
| Multi-agent / worktrees | `docs/handoff/MULTI-AGENT-WORKFLOW.md` |
| Ship docs checklist | `docs/handoff/HANDOFF-UPDATE.md` |
| Stack / folders | `docs/handoff/PROJECT.md` |
| SQL | `docs/handoff/SUPABASE.md`, `supabase/migrations/`, `scripts/*.sql` |
| Secrets pointers (no values) | `docs/handoff/SECRETS.md` |
| Design | `docs/design/FTC_DESIGN_SYSTEM.md` |
| Beta / QA | `docs/qa/` |
| Marketing leave-behind | `docs/marketing/CAPABILITY-BRIEF.html` |
| This handover | `docs/handoff/QWEN-FULL-HANDOVER.md` |

---

## 10. End goal

Start as event workflow. Over years, ecosystem for independent music — promoters, DJs, venues, crew, fans, discovery, content, reputation, monetisation — each layer growing from the operational core so FTC stays cohesive instead of becoming “an app that does everything.”

**Can work. Not guaranteed.** First proof:

> Can ~5–10 Melbourne promoters run real recurring events through FTC and keep returning?

Until that is true: **usage over vision. Fix over feature. Honesty over agreement.**

---

*Last updated: 2026-10-05. When product stage or process changes, update this file and `CURRENT-STATE.md`.*
