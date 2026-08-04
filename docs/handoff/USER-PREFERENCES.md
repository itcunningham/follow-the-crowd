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
- **Ship small approved fixes to `main` for Production.** Branch Previews show **"No target"** and are useless for device QA on `follow-the-crowd.vercel.app`. Do not leave a finished bugfix / polish PR sitting only on a Preview branch — merge (or fast-forward) to `main` so Vercel Production picks it up. Large/risky work can still use a PR first; once Isaac says ship / merge / "to main", land it on `main` the same turn.

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
