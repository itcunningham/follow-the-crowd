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
| `CURRENT-STATE.md` | What is already built (update after every completed ship) |
| `HANDOFF-UPDATE.md` | **Checklist — update handoff when a job completes** |
| `SUPABASE.md` | SQL scripts and run order |
| `SECRETS.md` | Where credentials live (Vercel, Supabase, password manager) — no secret values |

## Keep this updated

**Every completed job:** Cursor updates handoff docs using `HANDOFF-UPDATE.md` (at minimum `CURRENT-STATE.md` + recent commits).

You can also ask: **Update docs/handoff/**
