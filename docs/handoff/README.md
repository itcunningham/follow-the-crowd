# Session handoff

Use this folder when starting a **new Cursor chat** so you do not re-explain the project.

## Fastest start

**Cursor (product + Builder):** 

Read docs/handoff/PRODUCT-HANDOVER.md and docs/handoff/BRAND-PHILOSOPHY.md, then docs/handoff/CURRENT-STATE.md. Follow HOW-WE-WORK.md. My task: [your task]

**Claude (any session):** open the FTC repo and say:

Read docs/handoff/CLAUDE-FULL-HANDOVER.md fully, then docs/handoff/CURRENT-STATE.md. Follow FTC_WORKFLOW.md. Ship finished work to main. My task: [your task]

(Older: `CLAUDE-CODE-BUILDER-HANDOVER.md` — superseded for day-one paste by `CLAUDE-FULL-HANDOVER.md`.)

**Legacy:** `START-HERE-GPT.md` exists for old ChatGPT pastes — ChatGPT is **no longer** the live product partner. Prefer Cursor + this folder.

## Files

| File | Purpose |
|------|---------|
| `PRODUCT-HANDOVER.md` | **Day-one complete product/strategy handover — stage, beta, metrics, roles, roadmap layers** |
| `BRAND-PHILOSOPHY.md` | **Source of truth — mission, enemy (friction), feature gate, brand voice. For the Culture.** |
| `PROMOTER-INTERVIEWS.md` | **Raw promoter/planner interview notes** — themes + quotes; not a feature backlog |
| `PRODUCT-VISION.md` | Product roadmap depth, GTM, revenue, UI/engineering standards, what not to build |
| `CLAUDE-FULL-HANDOVER.md` | **Full Claude day-one paste** — product, brand, Isaac prefs, stack, ship rules, traps |
| `CLAUDE-CODE-BUILDER-HANDOVER.md` | Older Claude Code Builder start (prefer `CLAUDE-FULL-HANDOVER.md`) |
| `CLAUDE-IMPLEMENTATION-HANDOVER.md` | Deep technical architecture / debt / DM patterns for Claude |
| `START-HERE-CURSOR.md` | Paste into new Cursor chat |
| `START-HERE-GPT.md` | Legacy ChatGPT paste — superseded by Cursor product role |
| `HOW-WE-WORK.md` | Who does what (Isaac / Cursor / Builder / QA / Release) |
| `MULTI-AGENT-WORKFLOW.md` | **Authoritative — worktrees, branch ownership, collision rules, release checklist** |
| `USER-PREFERENCES.md` | How Isaac wants work done |
| `PROJECT.md` | Stack, folders, conventions |
| `docs/design/FTC_DESIGN_SYSTEM.md` | Spacing, typography, shared UI rules |
| `CURRENT-STATE.md` | What is already built (update after every completed ship) |
| `ENGINEERING-HANDOVER.md` | **Concise, current entry point for a new engineer** — release state, build/test results, DB/RLS audit, push architecture, env vars, security findings, repo hygiene, known traps, architecture map. Points into the other docs rather than duplicating them; says which sections of the older docs are stale. |
| `HANDOFF-UPDATE.md` | **Checklist — update handoff when a job completes** |
| `BETA-BUG-AGENTS.md` | **Beta bug-fix agent setup — Claude Projects, prompts, severity routing** |
| `SUPABASE.md` | SQL scripts and run order |
| `SECRETS.md` | Where credentials live (Vercel, Supabase, password manager) — no secret values |

## QA / Beta readiness

| Path | Purpose |
|------|---------|
| `docs/qa/` | Beta readiness checklists, test plan, regression, bug template, release checklist |
| `docs/qa/TESTER-ONBOARDING.md` | Coached beta tester welcome and version/bug-report instructions |
| `docs/qa/PRIVATE-BETA-GO-LIVE.md` | Coached private beta GO record and pre-invite operational checklist |
| `docs/qa/KNOWN-ISSUES.md` | Accepted Medium/Low issues for coached beta |

**Current phase:** Coached Private Beta (GO — 2026-07-16)

## Keep this updated

**Every completed job:** Cursor updates handoff docs using `HANDOFF-UPDATE.md` (at minimum `CURRENT-STATE.md` + recent commits).

You can also ask: **Update docs/handoff/**
