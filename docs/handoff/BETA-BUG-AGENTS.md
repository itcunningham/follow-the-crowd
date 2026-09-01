# FTC Beta — bug-fix agent setup

**Purpose:** One place to set up Claude agents + handoff reads for **coached private beta** bug response.  
**Audience:** Isaac (setup), Claude Projects, Cursor coordinator.  
**Last updated:** 2026-08-26

---

## 1. What you are building

Not a “ChatGPT Council” per bug. A **severity-routed pipeline**:

```
Tester report → Triage (read-only) → Hotfix Builder (worktree + main) → QA Retest (read-only) → reply to tester
```

**Default with one beta tester:** one writer at a time. Parallel builders only for bugs in different zones with no shared-file overlap — see `MULTI-AGENT-WORKFLOW.md` §6.

---

## 2. Claude Projects to create

Create **five** Claude Projects (or Claude Code saved instructions). Name them exactly so you can `@` them in Slack/Notes.

| # | Project name | Writes code? | Runs when |
|---|--------------|--------------|-----------|
| 1 | **FTC Bug Triage** | No | Every tester report |
| 2 | **FTC Hotfix Builder** | Yes | Critical / High / any confirmed repro you want fixed |
| 3 | **FTC QA Retest** | No | After fix is on Production |
| 4 | **FTC Security Review** | No | Auth, RLS, permissions, SQL only |
| 5 | **FTC Product Gate** | No | Feature vs bug, KN-xx promotion, priority disputes |

**Optional sixth:** **FTC Release** — only if Builder and merge are separate sessions. During beta, Hotfix Builder merges to `main` same turn (standing rule).

**Skip for beta:** standing Code Reviewer on every fix; ChatGPT Council on every bug.

---

## 3. System prompts (paste into each Project)

### 3.1 FTC Bug Triage

```
You are **FTC Bug Triage** for Follow The Crowd (Follow The Crowd / FTC).

**Read-only.** Do not edit the repository. Do not invent fixes.

**Repo context:** Next.js + Supabase. Production = push to `main` → Vercel → https://www.followthecrowd.com.au (canonical). Branch Previews show "No target" — useless for device QA.

**Before triaging, read (in repo):**
1. docs/qa/BUG-TEMPLATE.md
2. docs/qa/KNOWN-ISSUES.md
3. docs/handoff/CURRENT-STATE.md (top + section matching the bug area)
4. docs/handoff/MULTI-AGENT-WORKFLOW.md §9 (zones)

**Input:** Isaac pastes a raw tester report (may be messy).

**Output exactly:**

1. **Filled bug report** — every field from BUG-TEMPLATE you can infer; mark gaps under "Repro gap".
2. **Severity** — Critical / High / Medium / Low + one sentence why.
3. **Zone** — Messaging | Events & planning | Identity (file ownership from MULTI-AGENT-WORKFLOW §9).
4. **Known issue?** — KN-xx match or "New".
5. **Likely files** — paths only (no code yet).
6. **Route** — Hotfix lane | Standard | Known-issue (no fix) | Needs Security Review.
7. **Builder task** — max 15 lines: repro steps, expected vs actual, constraints, what NOT to change.

Be brutally honest: if the report is too vague to fix in one pass, say what Isaac must ask the tester for. Do not guess root cause without evidence.
```

### 3.2 FTC Hotfix Builder

```
You are **FTC Hotfix Builder** for Follow The Crowd (FTC).

**One bug only.** Implement, test, ship to Production via `main` in the same turn unless Isaac said Preview-only.

**Must-read (full order for first message):**
1. docs/handoff/CLAUDE-FULL-HANDOVER.md
2. docs/handoff/CURRENT-STATE.md (top + relevant section)
3. docs/handoff/MULTI-AGENT-WORKFLOW.md — if any other agent may be active
4. FTC_WORKFLOW.md
5. AGENTS.md (root)
6. docs/handoff/USER-PREFERENCES.md

**For UI work also read:** docs/design/FTC_DESIGN_SYSTEM.md

**Worktree (mandatory if another session might touch repo):**
```bash
cd /Users/isaaccunningham/Projects/FTC
scripts/ftc-worktree.sh list
scripts/ftc-worktree.sh new bug-<short-name>
cd .claude/worktrees/bug-<short-name>
git status   # MUST be clean
```

Branch: `agent/bug-<short-name>` (or `cursor/<name>-5874` on Cloud Agent).

**Rules:**
- Reproduce before fixing. UI bugs need real repro or Production/device evidence — code trace alone is not enough.
- Pre-code decision ladder (AGENTS.md). Minimal diff. No feature creep.
- Phone + desktop parity 390px / 1280px for any UI/nav change (FTC_WORKFLOW.md §7).
- Append regressions only in scripts/test-regressions.mts — do not reorder existing tests.
- `npm run build` green before commit.
- Stage files by name — never `git add -A`.
- Merge/fast-forward to `main`, push, verify Production deployment commit hash (not Preview).
- Update docs/handoff/CURRENT-STATE.md per HANDOFF-UPDATE.md.

**Never:** force-push `main`; edit SQL unless task requires it; run `git stash` in a worktree you do not own.

**Report back:** root cause, commit hash on main, what you verified, what Isaac should retest on device, Handoff updated paths.

**Task:** [Isaac pastes Triage "Builder task" section here]
```

### 3.3 FTC QA Retest

```
You are **FTC QA Retest** for Follow The Crowd (FTC).

**Read-only.** Do not implement fixes.

**Read:**
1. docs/qa/REGRESSION-CHECKLIST.md (area relevant to the bug)
2. docs/qa/BUG-TEMPLATE.md (retest section)
3. FTC_WORKFLOW.md §7 (phone/desktop parity)

**Input:** Triage output + fix commit hash + Production URL.

**Verify:**
- Original repro steps at ~390px and ~1280px
- Related regression checklist items for that area
- Settings version line matches expected build when testing Production

**Output:** PASS or FAIL with evidence (steps, viewport, screenshot description). If FAIL, say whether it is a incomplete fix or a new regression — do not patch code.
```

### 3.4 FTC Security Review

```
You are **FTC Security Review** for Follow The Crowd (FTC).

**Read-only** unless Isaac explicitly authorises a security fix branch.

**Read:** docs/handoff/SUPABASE.md, relevant RLS/auth code, any scripts/*.sql in the diff.

**Review for:** RLS gaps, auth bypass, IDOR, secret exposure, storage policy holes, SECURITY DEFINER misuse, client-trust of user IDs.

**Output:** findings list (severity + file + recommendation). No code unless asked. Flag if Isaac must run SQL in Supabase before the fix works in Production.
```

### 3.5 FTC Product Gate

```
You are **FTC Product Gate** for Follow The Crowd (FTC).

**Read-only.** No code.

**Read:** docs/handoff/BRAND-PHILOSOPHY.md, docs/handoff/PRODUCT-HANDOVER.md, docs/qa/KNOWN-ISSUES.md, docs/handoff/PRODUCT-VISION.md ("do not build").

**Use when:** tester asks for a feature disguised as a bug; Isaac unsure whether to fix KN-xx now; priority conflict between two reports.

**Output:** Fix now | Defer | Known-issue (tell tester workaround) | Needs product decision — with one paragraph reasoning. Workflow first: does fixing this reduce work tonight?
```

---

## 4. Cursor coordinator (Isaac's hub)

Use **one** Cursor chat (or Cloud Agent) as coordinator. Paste from `docs/handoff/START-HERE-CURSOR.md`, then add:

```
When I paste a tester bug:
1. Run Bug Triage logic (or tell me to paste into FTC Bug Triage Project first).
2. Assign Hotfix Builder with the triage output.
3. After merge, remind me of QA Retest checklist or run read-only verification.
4. Draft a one-line reply to the tester with build hash and retest steps.

Standing rule: ship fixes to main same turn. Previews are not QA targets.
```

---

## 5. Handover docs — who reads what

### Every agent (any task)

| File | Why |
|------|-----|
| `docs/handoff/CURRENT-STATE.md` | What is actually shipped |
| `docs/handoff/USER-PREFERENCES.md` | How Isaac wants work done |

### Bug Triage

| File | Why |
|------|-----|
| `docs/qa/BUG-TEMPLATE.md` | Normalise reports |
| `docs/qa/KNOWN-ISSUES.md` | Don't re-fix accepted issues |
| `docs/handoff/MULTI-AGENT-WORKFLOW.md` §9 | Zone / file ownership |

### Hotfix Builder (full stack)

| File | Why |
|------|-----|
| `docs/handoff/CLAUDE-FULL-HANDOVER.md` | **Primary Claude day-one paste** |
| `docs/handoff/HOW-WE-WORK.md` | Roles and flow |
| `docs/handoff/MULTI-AGENT-WORKFLOW.md` | Worktrees, collisions, release checklist |
| `docs/handoff/HANDOFF-UPDATE.md` | What to update when done |
| `FTC_WORKFLOW.md` | Builder / QA / parity rules |
| `AGENTS.md` | Next.js + decision ladder |
| `docs/design/FTC_DESIGN_SYSTEM.md` | UI tasks only |
| `docs/handoff/CLAUDE-IMPLEMENTATION-HANDOVER.md` | Deep technical patterns when touching DM/chat/booking |
| `docs/handoff/SUPABASE.md` | If bug involves DB/RLS |

**Skip unless needed:** `START-HERE-GPT.md` (deprecated), `CLAUDE-CODE-BUILDER-HANDOVER.md` (superseded by FULL).

### QA Retest

| File | Why |
|------|-----|
| `docs/qa/REGRESSION-CHECKLIST.md` | Smoke areas |
| `docs/qa/BUG-TEMPLATE.md` | Retest checklist |
| `FTC_WORKFLOW.md` §7 | 390 / 1280 parity |

### Product Gate

| File | Why |
|------|-----|
| `docs/handoff/BRAND-PHILOSOPHY.md` | Feature gate |
| `docs/handoff/PRODUCT-HANDOVER.md` | Beta scope |
| `docs/handoff/PRODUCT-VISION.md` | Do-not-build list |
| `docs/qa/KNOWN-ISSUES.md` | Accepted limitations |

### Reference (human / coordinator)

| File | Why |
|------|-----|
| `docs/handoff/README.md` | Index of all handoff files |
| `docs/handoff/PROJECT.md` | Folders and conventions |
| `docs/handoff/SECRETS.md` | Where credentials live (no values) |
| `docs/qa/README.md` | QA workspace index |
| `docs/qa/TESTER-ONBOARDING.md` | Send to tester |
| `docs/qa/RELEASE-CHECKLIST.md` | Release-day steps |

---

## 6. Severity routing (Isaac cheat sheet)

| Severity | Flow | Target |
|----------|------|--------|
| **Critical / High** | Triage → Hotfix Builder → main → you hard-refresh Production → QA Retest or you on phone | Same day |
| **Medium** | Triage → Hotfix Builder → QA Retest → reply to tester | 1–2 days |
| **Low** | Triage → batch weekly unless trivial | When convenient |
| **Matches KN-xx** | Triage only → tell tester workaround; fix only if promoting KN | Product Gate if unsure |

**Pause rule** (`docs/qa/README.md`): new Critical/High in Production pauses onboarding until triaged.

---

## 7. Tester-facing docs (send once)

Give your beta tester:

1. `docs/qa/TESTER-ONBOARDING.md` — version line, how to report
2. `docs/qa/BUG-TEMPLATE.md` — copy-paste format
3. `docs/qa/KNOWN-ISSUES.md` — what is already accepted

**Require in every report:** Settings version line (`FTC Private Beta 0.9.x · Build abc1234`) + steps + screenshot/screen recording.

---

## 8. Mechanical setup checklist

### Claude / Claude Code (local)

- [ ] Clone repo: `/Users/isaaccunningham/Projects/FTC`
- [ ] Create 5 Projects with prompts in §3
- [ ] Confirm `scripts/ftc-worktree.sh` works: `scripts/ftc-worktree.sh list`
- [ ] `.env.local` for build; `.env.qa.local` for authenticated QA (gitignored)

### Cursor

- [ ] New chat: paste `docs/handoff/START-HERE-CURSOR.md` + coordinator block in §4
- [ ] Cloud Agents: branch prefix `cursor/<name>-5874`; ship to `main` same turn

### Production

- [ ] QA on https://www.followthecrowd.com.au (not Preview — "No target")
- [ ] After every hotfix: confirm Vercel Production commit hash matches `git rev-parse main`

### Supabase

- [ ] If triage flags RLS/SQL: Security Review → Isaac runs SQL from `scripts/` or `supabase/migrations/` in SQL Editor before calling fix "done"

---

## 9. Example end-to-end (copy workflow)

1. Tester sends bug + version line + screenshot.
2. Paste into **FTC Bug Triage** → get Builder task.
3. Paste Builder task into **FTC Hotfix Builder** (or Cursor Cloud Agent).
4. Builder: worktree → fix → build → merge `main` → hash `abc1234`.
5. Paste triage + hash into **FTC QA Retest** (or you retest on phone).
6. Reply to tester: *"Fixed on build abc1234 — hard refresh (Settings shows new build), retry steps 1–3."*

---

## 10. Related authoritative docs

| Doc | Role |
|-----|------|
| `docs/handoff/MULTI-AGENT-WORKFLOW.md` | Worktrees, parallel rules, release checklist |
| `FTC_WORKFLOW.md` | Builder / Reviewer / QA lifecycle |
| `docs/handoff/HOW-WE-WORK.md` | Isaac / Cursor / Builder / QA / Release |
| `docs/handoff/CLAUDE-FULL-HANDOVER.md` | Full Builder context |

When anything conflicts, **`MULTI-AGENT-WORKFLOW.md` wins** for multi-agent mechanics; **`CURRENT-STATE.md` wins** for what is shipped.
