# How we work

## Roles

| Who | Job |
|-----|-----|
| **Isaac** | Founder / product owner. Final UX and release decisions. Runs SQL in Supabase. Real-device QA. Talks to users. |
| **Cursor Agent** | **Product Owner assistant, UX reviewer, technical planning partner, and agent coordinator** (took over the former ChatGPT product role). Also implements in-repo when acting as Builder: terminal/build, SQL files, commits when asked. Decides what to build vs wait, challenges feature creep, assigns Builder/QA/Release work, verifies diagnoses before trusting them. |
| **Claude / Builder agents** | Inspect repo, implement, test, commit/push feature branches (often via worktrees). |
| **QA Reviewer** | Independent break-testing. Does not implement fixes. |
| **Release Agent** | Integrates approved branches to `main`, proves Production. |
| **ChatGPT** | **Deprecated for FTC product work.** Historical specs may exist; do not treat ChatGPT as the live product partner. Use Cursor + `docs/handoff/`. |

Day-one handover: `PRODUCT-HANDOVER.md`. Brand: `BRAND-PHILOSOPHY.md`.

## Typical flow

1. Idea or bug → shape with **Cursor** (product/UX/priority)
2. Cursor (or Isaac) assigns Builder task; use `START-HERE-CURSOR.md` in new Builder chats
3. Builder codes in a worktree + `npm run build` / regressions
4. QA Reviewer when the task warrants it
5. If `supabase/migrations/` added: Isaac runs SQL in Supabase **before** relying on it in prod
6. Isaac tests on device when needed
7. Release Agent merges/pushes `main` and verifies Production
8. **Update `docs/handoff/`** per `HANDOFF-UPDATE.md` before closing the task

## What agents should never assume

- SQL has **not** been run unless Isaac says so
- Do not force-push `main`
- **Always land finished work on `main` (Production / Vercel).** Branch Previews show **"No target"** — Isaac cannot QA them on `follow-the-crowd.vercel.app`. When a bug fix or polish is done, merge/fast-forward to `main` in the **same turn**. Do not wait for a separate ship ask. Large/risky work may use a PR first; still land on `main` once done.
- Do not add features beyond the task
- Do not write long reports unless asked
- A Preview deploy is **not** Production
- “Cool” ≠ retention — beta usage beats new vision

## New chat recovery

Always point agents at `docs/handoff/` first (`PRODUCT-HANDOVER.md` + `BRAND-PHILOSOPHY.md` + `CURRENT-STATE.md`).

After shipping, update handoff per `HANDOFF-UPDATE.md`.
