# Session handoff

Use this folder when starting a **new Cursor chat** or **new ChatGPT chat** so you do not re-explain the project.

## Fastest start

**Cursor:** open a new chat and say:

Read everything in docs/handoff/ and follow it. Then: [your task]

**ChatGPT:** paste the contents of `START-HERE-GPT.md`, then add your task.

## Files

| File | Purpose |
|------|---------|
| `START-HERE-CURSOR.md` | Paste into new Cursor chat |
| `START-HERE-GPT.md` | Paste into new ChatGPT chat |
| `HOW-WE-WORK.md` | Who does what (you / Cursor / GPT) |
| `USER-PREFERENCES.md` | How Isaac wants work done |
| `PROJECT.md` | Stack, folders, conventions |
| `docs/design/FTC_DESIGN_SYSTEM.md` | Spacing, typography, shared UI rules |
| `CURRENT-STATE.md` | What is already built (update after every completed ship) |
| `HANDOFF-UPDATE.md` | **Checklist — update handoff when a job completes** |
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
