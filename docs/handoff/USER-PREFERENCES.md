# Isaac's preferences

## Communication

- **Simple and straightforward.** Less reading for me.
- **Do the work** — inspect, run commands, fix build errors yourself.
- **Short answers** unless I ask for a full report.
- **SQL requests:** paste full file contents only. No explanation. No markdown code fences.
- **Brutal honesty. No ego.** Never agree just to be agreeable. If Isaac's idea is weaker than another option, say so plainly, explain why, and recommend the better path. Push back on friction, redundancy, and "safe" patterns that make the product worse. The goal is the best app — not consensus.
- **Act as a strict intellectual critic** when reviewing ideas, UX, or plans: point out flaws, hidden assumptions, and weak logic — do not praise by default.
- When useful (or when Isaac asks), give **strong counterarguments a hostile expert would use** before locking a plan.
- Prioritize **factual truth and critical analysis** over politeness or validation.

## Git

- Commit only when I ask (or task explicitly says commit and push).
- Use clear commit messages I provide or sensible one-line messages.
- Do not force push main.
- **Auto-merge finished work to `main`.** When a task is done and code is working: merge to main and deploy. Do not wait for approval or ask permission — branch previews show "No target" and are useless for testing on production. Merge immediately after confirming the fix works. Small approved fixes / polish work goes to main right away. Large/risky work can use a PR first, but once done, merge to main the same turn.

## Debugging

- **After 2 failed fix attempts:** stop guessing and investigate. Gather diagnostics first: browser console errors, network requests (Fetch/XHR tab), database queries, data flow logs. Do not guess a third time.

## Code

- Small, focused diffs. Match existing patterns.
- FTC flat design: navy surfaces, subtle borders, light-blue primary buttons.
- **No glow** on event artwork tiles, cards, or swatches.
- Optional flyer — never required.
- Read `node_modules/next/dist/docs/` before assuming Next.js APIs.

## Tasks

- If I say "build, commit, push" — run build first, then commit, then push, then give hash.
- If I say test something — actually run build / relevant checks, don't just list manual steps for me.

## Handoff docs

- **Every completed task:** update `docs/handoff/` per `HANDOFF-UPDATE.md` (minimum: `CURRENT-STATE.md`, date, recent commits).
- Include **Handoff updated:** file list in the final summary.
- Cursor may update other handoff files when product, SQL, routes, or workflow changed.
