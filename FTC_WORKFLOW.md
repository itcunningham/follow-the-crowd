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
- Creates test plans and verifies **phone/desktop parity** (see §7).
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
4. **Builder** updates `docs/handoff/` per `docs/handoff/HANDOFF-UPDATE.md`.
5. **QA** tests the deployed/local result.
6. **Only then** start the next feature.

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
| **Handoff updated** | Which `docs/handoff/` files were updated (Builder, when task completes) |

---

## 5. Pre-code decision ladder

Before writing code, walk this ladder top to bottom and **stop at the first rung that holds**:

1. **Does this need to exist?** → No: skip it.
2. **Already in this codebase?** → Reuse it; do not duplicate.
3. **Stdlib does it?** → Use stdlib.
4. **Native platform feature?** → Use it.
5. **Installed dependency?** → Use an existing package.
6. **One line?** → One line.
7. **Only then:** the minimum that works.

## 6. FTC product rules

- **MVP-first** — smallest reliable version.
- **Mobile-first** at **390px** width.
- **Visual design** — dark navy surfaces, subtle borders, solid accent colours; no neon, glow, gradients, or cyberpunk styling.
- **No raw UUIDs** in UI.
- **Do not duplicate** booking or chat logic — reuse existing components and queries.
- **Preserve behaviour** — Supabase RLS and existing booking, DM, group chat, flyer, run-sheet, and rate-proposal flows must not regress.

---

## 7. Phone / desktop parity (permanent — from 2026-07-19)

Every FTC change must work on **both** reference viewports:

| Viewport | Width | Use |
|--------|-------|-----|
| **Phone** | ~**390px** | Primary design and touch behaviour |
| **Desktop** | ~**1280px** | Layout response and pointer behaviour |

**Parity means the same:** features, labels/terminology, status logic, permissions, loading/empty/error meaning, navigation destinations, booking and messaging outcomes, profile information, and accessibility semantics.

**Parity does not mean** stretching the mobile UI across desktop. Responsive layout may differ when behaviour stays equivalent.

### Builder requirements (every UI, loading, or navigation change)

1. Verify at **~390px** and **~1280px** (or document why a viewport is N/A).
2. Confirm **behavioural parity** — not just visual similarity.
3. Confirm **responsive layout** is intentional (no horizontal overflow, no hidden actions on one viewport only).
4. Reuse shared components and business logic; do not fork mobile/desktop product versions.
5. Run targeted regression + `npm run build` before commit.

Report separately: **mobile result**, **desktop result**, **intentional differences**, **unintended differences**.

### QA requirements

Follow `docs/qa/REGRESSION-CHECKLIST.md` on **both** viewports for any release or post-ship verification of UI/navigation/loading changes. File bugs with separate mobile/desktop notes via `docs/qa/BUG-TEMPLATE.md`.

### Intentional responsive differences (not parity failures)

Examples already in the product: bottom main nav on phone vs top bar on desktop; Calendar mobile day strip vs desktop month grid; workspace sub-nav horizontal scroll on phone vs wrap on desktop. Same routes, permissions, and outcomes.

---

## Quick reference

```
Reviewer → QA checklist → Builder (build, commit, push) → QA verify → next feature
```

Only Builder writes code. Reviewer and QA observe unless explicitly authorised.
