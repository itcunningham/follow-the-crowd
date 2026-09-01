# Bug summary

**One-line title:** `npm run test:regressions` halts at test 86 of 305 — `lib/navigationBadgeCache.ts` is instantiated twice under tsx, so the suite's state writes never reach the code under test

**Reported by:** QA retest (automated pass)
**Date:** 2026-09-01
**App version & build:** FTC Private Beta 0.9.0 · Commit `e1927a0`
**Environment:** Local (clean checkout, `npm install` against the committed `package-lock.json`, Node v22.22.2, tsx 4.22.4)

---

## Severity

- [ ] **Critical** — Data loss, security, auth broken, or core flow completely blocked
- [x] **High** — Major feature unusable; no reasonable workaround
- [ ] **Medium** — Partial breakage; workaround exists
- [ ] **Low** — Cosmetic, copy, or minor UX issue

The product is not affected. The **regression gate** is: `FTC_WORKFLOW.md` §8 requires "targeted regression + `npm run build` before commit", and 219 of 305 tests cannot run. `docs/handoff/CURRENT-STATE.md` already calls fixing this halt "the highest-value follow-up"; this report supplies the root cause it was missing.

---

## Testing status

- [x] **Failed** (this report)
- [ ] **Blocked** (cannot retest until fixed)

---

## User role & device

| Field | Value |
|-------|-------|
| Role | N/A — developer tooling, not a user-facing flow |
| Phone (~390px) | Not applicable |
| Desktop (~1280px) | Not applicable |
| Also reproduced on other viewport? | N/A — no UI involved |
| Browser | N/A — Node test runner |
| Account | None required |

---

## Area

- [x] Edge cases / Other (developer tooling — regression harness)

---

## Steps to reproduce

1. Clean checkout at `e1927a0`, `npm install`.
2. Create any `.env.local` (the script runs with `tsx --env-file=.env.local`; placeholder Supabase values are enough).
3. `npm run test:regressions`.

---

## Expected result

The suite runs all 305 test functions called from `main()` and reports a pass.

---

## Actual result

The runner throws on the 86th call and aborts, so **219 tests never execute**:

```
AssertionError [ERR_ASSERTION]: authoritative zero must replace an empty session display
1 !== 0
    at testWorkspaceGigsPendingDisplayCountPreservesLastKnown (scripts/test-regressions.mts:5103:10)
    at main (scripts/test-regressions.mts:18620:3)
```

### Root cause — module state is split across two copies of the same file

`lib/navigationBadgeCache.ts` keeps its badge state in module-level variables
(`runtimeGigsPendingCount`, `workspaceGigsDisplaySession`, …). Under tsx that file is
**loaded twice**, from the same URL, through two different loaders:

```
[MODULE LOAD] file:///…/lib/navigationBadgeCache.ts
    at loadCJSModule (node:internal/modules/esm/translators:166:3)      ← copy A
[MODULE LOAD] file:///…/lib/navigationBadgeCache.ts
    at Object.transformer (node_modules/tsx/dist/register-BOkp8V6j.cjs) ← copy B
    at Module.require (node:internal/modules/cjs/loader:1463:12)
```

* **Copy A** is what `scripts/test-regressions.mts` (an ESM `.mts` entry) gets from its
  `import … from "../lib/navigationBadgeCache"`.
* **Copy B** is what `lib/navigation/resolveWorkspaceGigsPendingDisplayCount.ts` gets from
  its own `require`d `import … from "@/lib/navigationBadgeCache"`, because lib-to-lib
  imports resolve through Node's CJS loader, which has a cache separate from the ESM
  translator's.

So the test's `clearWorkspaceGigsDisplaySession()` and
`writeRuntimeGigsPendingCount(…, { authoritative: true })` mutate **copy A**, while
`resolveWorkspaceGigsPendingDisplayCount` reads **copy B** — which still holds the session
count `1` written by the test's own first two assertions. Instrumenting the resolver shows
the two views side by side at the moment of the failing assertion:

```
OUTER (test's copy A)      cached = 0     session = null
[DBG-resolve] (copy B)     cached = null  session = 1     → returns 1
```

### The product logic is correct

Re-running the exact same three-step scenario with **every** import resolving to one
instance (a probe module inside `lib/` importing both the cache and the resolver through
`@/`, the way the Next.js bundle does) produces exactly what the test asserts:

```
same-instance result: { s1: 1, s2: 1, s3: 0 }   (expected s1=1, s2=1, s3=0)
```

`app/` and `lib/` import this module only via the `@/` alias and webpack resolves that to a
single instance, so **no user-facing behaviour is wrong**. This is a harness defect only.

### Why earlier rounds disagreed about this test

`CURRENT-STATE.md` (2026-08-16) recorded that this test "passes both in isolation and in the
full ordered run". That is consistent with the mechanism above: in isolation the split state
is harmless, and the failure only appears once the same run has already populated copy B.
Later rounds recorded it as halting again. Both observations were correct; the split
instance is what reconciles them.

---

## Frequency

- [x] Always

Deterministic — 3 for 3 on the full suite, and reproduces in a 15-line standalone script.

---

## Console / network errors (if visible)

See the assertion and the two `[MODULE LOAD]` stacks above. No secrets involved.

---

## Workaround (if any)

Run an affected test by extraction (import the function into a scratch script), which is
what recent Builder rounds have been doing. This does not restore suite coverage.

---

## Notes for Builder

The fix belongs on the harness side, not on `resolveWorkspaceGigsPendingDisplayCount`,
which behaves correctly. Any of these removes the split for this test; QA has not chosen
between them:

1. Have the test reach the cache helpers **through the same module graph as the code under
   test** — e.g. re-export the handful of state helpers it needs from
   `lib/navigation/resolveWorkspaceGigsPendingDisplayCount.ts` (or a small test-support
   module that itself imports them with `@/`) and import them from there.
2. Give the resolver an explicit reset/seed entry point the test calls, instead of the test
   poking module-level state in a sibling file.
3. Make the runner load the suite so that `.ts` files resolve through one loader only.

Whichever is chosen, it is worth checking the same way for **other** tests that import a
stateful `lib/` singleton directly from `scripts/test-regressions.mts` — the mechanism is
general, not specific to this test, and it only bites modules that keep module-level state.

Two related facts found while retesting, both worth knowing before touching the harness:

* **Node 20 cannot run the suite at all.** `@supabase/realtime-js` throws
  "Node.js detected but native WebSocket not found … Ensure you are running Node.js 22+"
  at `lib/supabaseClient.ts` import time. The suite therefore requires Node 22+, which is
  the version the split reproduces on. `.github/workflows/security.yml` pins `node-version: '20'`,
  but no CI job runs `test:regressions`, so nothing currently catches this halt automatically.
* Once the halt is fixed, expect the remaining 219 tests to surface their own failures —
  prior rounds (`CURRENT-STATE.md`, 2026-08-16) found nine stale assertions the last time a
  long-standing halt was cleared.

---

## Retest checklist (after fix)

- [ ] `npm run test:regressions` runs all 305 calls in `main()` to completion
- [ ] `testWorkspaceGigsPendingDisplayCountPreservesLastKnown` passes in the full ordered run, not only in isolation
- [ ] Mutation check: breaking the authoritative-zero branch in `resolveWorkspaceGigsPendingDisplayCount` makes the test fail again
- [ ] The push tests previously stranded behind the halt are confirmed reached and passing
- [ ] Phone (~390px) verified — N/A, no UI change
- [ ] Desktop (~1280px) verified — N/A, no UI change
- [ ] Behavioural parity confirmed per `FTC_WORKFLOW.md` §7 — N/A, no UI change
- [ ] Intentional responsive differences documented (if any) — none
