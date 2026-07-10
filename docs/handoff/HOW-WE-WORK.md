# How we work

## Roles

| Who | Job |
|-----|-----|
| **Isaac** | Product owner. Runs SQL in Supabase. Manual testing. Says what to build. |
| **Cursor Agent** | Implements in repo. Runs terminal/build. Creates SQL files. Commits when asked. |
| **ChatGPT** | Planning, specs, QA lists, prompts for Cursor, SQL sanity-check. No direct repo access. |

## Typical flow

1. Idea or bug → ChatGPT optional (shape the task)
2. Paste task into **Cursor** (use `START-HERE-CURSOR.md` in new chats)
3. Cursor codes + `npm run build`
4. If the task adds a file under `supabase/migrations/`, Isaac pastes that migration into the **Supabase SQL Editor** and runs it once **before** deploying the app
5. Isaac tests in browser
6. Cursor commits/pushes when asked

## What Cursor should never assume

- SQL has **not** been run unless Isaac says so
- Do not push unless asked
- Do not add features beyond the task
- Do not write long reports unless asked

## New chat recovery

Always point Cursor at `docs/handoff/` first.

After shipping something large, update `CURRENT-STATE.md`.
