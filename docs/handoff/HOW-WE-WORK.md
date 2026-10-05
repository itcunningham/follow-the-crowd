# How we work

## Roles

| Who | Job |
|-----|-----|
| **Isaac** | Founder / product owner. Final UX and release decisions. Runs SQL in Supabase. Real-device QA. Talks to users. Speaks ideas with **Qwen**, then pastes Builder prompts into **Cursor**. |
| **Qwen** | **Coordinator** — product critic, UX/priority partner, prompt author for Cursor. Day-one paste: `QWEN-FULL-HANDOVER.md`. Shapes ideas → clear build/fix tasks. Brutal honesty. Does not need to touch the repo for every task. |
| **Cursor Agent** | **Primary Builder** (and Release when shipping). Implements in-repo from Isaac/Qwen prompts: inspect, build, test, commit, ship to `main`. May still challenge weak scope if a prompt would break workflow-first rules. Summons native `@` agent rules when the task names them. |
| **Claude / other Builder agents** | Optional extra implementers (often worktrees) when Cursor is busy or Isaac assigns a parallel lane. |
| **QA Reviewer** | Independent break-testing. Does not implement fixes. |
| **Release Agent** | Integrates approved branches to `main`, proves Production. (Cursor often does this for small ships.) |
| **ChatGPT** | **Deprecated for FTC product work.** Historical specs may exist; do not treat ChatGPT as the live product partner. |

Day-one handover: `PRODUCT-HANDOVER.md`. Brand: `BRAND-PHILOSOPHY.md`. Qwen: `QWEN-FULL-HANDOVER.md`.

## Typical flow

1. Idea or bug → shape with **Qwen** (product/UX/priority / prompt)
2. Isaac pastes the Qwen prompt into **Cursor** (Builder); use `START-HERE-CURSOR.md` in new Builder chats when needed
3. Cursor builds/fixes in-repo + `npm run build` / regressions
4. QA Reviewer when the task warrants it (or `@qa-retest`)
5. If `supabase/migrations/` added: Isaac runs SQL in Supabase **before** relying on it in prod
6. Isaac tests on device when needed
7. Cursor / Release Agent merges/pushes `main` and verifies Production
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

Always point agents at `docs/handoff/` first (`PRODUCT-HANDOVER.md` + `BRAND-PHILOSOPHY.md` + `CURRENT-STATE.md`). Qwen: `QWEN-FULL-HANDOVER.md`.

After shipping, update handoff per `HANDOFF-UPDATE.md`.

## 🤖 Native Agent Workflow (Updated Oct 2026)

External Claude Projects are **deprecated**. Bug triage, hotfix, QA retest, security review, and product gate now run as native Cursor rules under `.cursor/rules/`.

Summon via `@filename` in chat:

| Agent | Rule file |
|-------|-----------|
| Bug Triage | `@bug-triage` → `.cursor/rules/bug-triage.md` |
| Hotfix Builder | `@hotfix-builder` → `.cursor/rules/hotfix-builder.md` |
| QA Retest | `@qa-retest` → `.cursor/rules/qa-retest.md` |
| Security Review | `@security-review` → `.cursor/rules/security-review.md` |
| Product Gate | `@product-gate` → `.cursor/rules/product-gate.md` |

**Qwen (Coordinator)** authors the task; **Cursor** executes the named `@` rule / build. Do not use external Claude Projects.
