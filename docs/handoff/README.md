# Session handoff

Use this folder when starting a **new chat** so you do not re-explain the project.

**Current phase:** Coached Private Beta (GO — 2026-07-16)

## Fastest start

**Cursor (product + Builder):**

Read docs/handoff/PRODUCT-HANDOVER.md and docs/handoff/BRAND-PHILOSOPHY.md, then docs/handoff/CURRENT-STATE.md. Follow HOW-WE-WORK.md. My task: [your task]

**Claude (any session):** open the FTC repo and say:

Read docs/handoff/CLAUDE-FULL-HANDOVER.md fully, then docs/handoff/CURRENT-STATE.md. Follow FTC_WORKFLOW.md. Ship finished work to main. My task: [your task]

## Files

Every file in this folder, grouped by what you need it for.

### Start here

| File | Purpose |
|------|---------|
| [PRODUCT-HANDOVER.md](./PRODUCT-HANDOVER.md) | **Day-one complete product/strategy handover** — stage, beta, metrics, roles, roadmap layers |
| [CLAUDE-FULL-HANDOVER.md](./CLAUDE-FULL-HANDOVER.md) | **Full Claude day-one paste** — product, brand, Isaac prefs, stack, ship rules, traps |
| [START-HERE-CURSOR.md](./START-HERE-CURSOR.md) | Paste into a new Cursor chat |
| [CURRENT-STATE.md](./CURRENT-STATE.md) | **What is already built** — update after every completed ship |

### Product and brand

| File | Purpose |
|------|---------|
| [BRAND-PHILOSOPHY.md](./BRAND-PHILOSOPHY.md) | **Source of truth** — mission, enemy (friction), feature gate, brand voice. For the Culture. |
| [PRODUCT-VISION.md](./PRODUCT-VISION.md) | Roadmap depth, GTM, revenue, UI/engineering standards, what not to build |
| [PROMOTER-INTERVIEWS.md](./PROMOTER-INTERVIEWS.md) | **Raw promoter/planner interview notes** — themes + quotes; not a feature backlog |

### How we work

| File | Purpose |
|------|---------|
| [HOW-WE-WORK.md](./HOW-WE-WORK.md) | Who does what (Isaac / Cursor / Builder / QA / Release) |
| [MULTI-AGENT-WORKFLOW.md](./MULTI-AGENT-WORKFLOW.md) | **Authoritative** — worktrees, branch ownership, collision rules, release checklist |
| [USER-PREFERENCES.md](./USER-PREFERENCES.md) | How Isaac wants work done |
| [HANDOFF-UPDATE.md](./HANDOFF-UPDATE.md) | **Checklist — update handoff when a job completes** |
| [BETA-BUG-AGENTS.md](./BETA-BUG-AGENTS.md) | **Beta bug-fix agent setup** — Claude Projects, prompts, severity routing |

### Engineering

| File | Purpose |
|------|---------|
| [ENGINEERING-HANDOVER.md](./ENGINEERING-HANDOVER.md) | **Concise, current entry point for a new engineer** — release state, build/test results, DB/RLS audit, push architecture, env vars, security findings, repo hygiene, known traps, architecture map. Points into the other docs rather than duplicating them; says which sections of the older docs are stale. |
| [CLAUDE-IMPLEMENTATION-HANDOVER.md](./CLAUDE-IMPLEMENTATION-HANDOVER.md) | Deep technical architecture / debt / DM patterns for Claude |
| [PROJECT.md](./PROJECT.md) | Stack, folders, conventions |
| [SUPABASE.md](./SUPABASE.md) | Migrations, SQL scripts, and run order |
| [SECRETS.md](./SECRETS.md) | Where credentials live (Vercel, Supabase, password manager) — no secret values |
| [CLAUDE-NAV-BUG-HANDOVER.md](./CLAUDE-NAV-BUG-HANDOVER.md) | Single-bug Builder handover — bottom nav dead after returning to Events. **Fixed 2026-08-26**; kept as the diagnosis record for that class of nav failure (see `CURRENT-STATE.md`). |

### Not indexed

Both files are still in the folder; neither is a current starting point.

| File | Why |
|------|-----|
| `START-HERE-GPT.md` | Deprecated — ChatGPT is no longer the live product partner. Use Cursor + this folder. Kept so old pastes still make sense. |
| `CLAUDE-CODE-BUILDER-HANDOVER.md` | Superseded by [CLAUDE-FULL-HANDOVER.md](./CLAUDE-FULL-HANDOVER.md) |

## Related, outside this folder

| Path | Purpose |
|------|---------|
| [docs/qa/README.md](../qa/README.md) | **Full QA index** — beta readiness, test plan, regression, bug template, release checklist, environment reset |
| [docs/design/FTC_DESIGN_SYSTEM.md](../design/FTC_DESIGN_SYSTEM.md) | Spacing, typography, shared UI rules |
| `FTC_WORKFLOW.md` | Builder / Reviewer / QA roles; **§7 phone/desktop parity (authoritative)** |

## Keep this updated

**Every completed job:** update handoff docs using [HANDOFF-UPDATE.md](./HANDOFF-UPDATE.md) (at minimum `CURRENT-STATE.md` + recent commits). Add a row above when you add a file to this folder.

You can also ask: **Update docs/handoff/**
