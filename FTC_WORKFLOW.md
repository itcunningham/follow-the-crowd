# FTC Workflow — Follow The Crowd

Working agreement for agents and humans building Follow The Crowd (FTC).

---

## 1. Roles

### Builder
- **Only agent allowed** to edit feature code, run builds, commit, and push.
- Implements one approved task at a time.
- Runs `npm run build` before commit.
- Commits and pushes when the task requires it.

### Reviewer
- **Read-only** unless explicitly authorised.
- Reviews code, security, data flow, and risks.
- **Never commits or pushes.**

### QA
- **Read-only** unless explicitly authorised.
- Creates test plans and checks mobile UX at **390px** width.
- **Never commits or pushes.**

---

## 2. One writer rule

- Only **one Builder task** may edit the repository at a time.
- Reviewer and QA **must not edit files** while Builder is working.
- **No agent may change Supabase SQL** unless the task explicitly requests SQL.

---

## 3. Task lifecycle

1. **Reviewer** identifies risks and gives a short recommendation.
2. **QA** writes a short test checklist.
3. **Builder** implements one approved task, runs `npm run build`, commits, pushes.
4. **QA** tests the deployed/local result.
5. **Only then** start the next feature.

---

## 4. Handover format

Every agent response must include:

| Field | Description |
|-------|-------------|
| **Task** | What this turn was asked to do |
| **Files inspected/changed** | Paths touched or read for context |
| **What was not changed** | Scope deliberately left alone |
| **Risks or blockers** | Security, data, UX, or process concerns |
| **Next action** | Who does what next (Reviewer / QA / Builder) |

---

## 5. FTC product rules

- **MVP-first** — smallest reliable version.
- **Mobile-first** at **390px** width.
- **Visual design** — dark navy surfaces, subtle borders, solid accent colours; no neon, glow, gradients, or cyberpunk styling.
- **No raw UUIDs** in UI.
- **Do not duplicate** booking or chat logic — reuse existing components and queries.
- **Preserve behaviour** — Supabase RLS and existing booking, DM, group chat, flyer, run-sheet, and rate-proposal flows must not regress.

---

## Quick reference

```
Reviewer → QA checklist → Builder (build, commit, push) → QA verify → next feature
```

Only Builder writes code. Reviewer and QA observe unless explicitly authorised.
