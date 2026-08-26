# Claude Builder Handover — FTC bottom-nav dead after returning to Events

**Created:** 2026-08-26  
**Audience:** Claude Code / Claude Builder (paste this and ship)  
**Repo:** `itcunningham/follow-the-crowd`  
**Current `main`:** `969b2be6` (Production already has the two failed fixes below)  
**Canonical site:** `https://followthecrowd.com.au` (www redirect OK)  
**Ship rule:** when fixed + build green → merge/`push origin/main` same turn. Branch Previews show “No target”; Isaac QAs Production.

---

## Paste starter

```
You are Builder for Follow The Crowd (FTC).
Read docs/handoff/CLAUDE-NAV-BUG-HANDOVER.md fully, then FTC_WORKFLOW.md + docs/handoff/USER-PREFERENCES.md.
One task only: prove and fix the Events↔Messages/Profile bottom-nav bug. No speculative UI/z-index/gesture patches.
Ship to main + verify Production READY when done. Update docs/handoff/CURRENT-STATE.md.
```

---

## Bug (still live on Production)

After:
1. Open Events  
2. Go Messages or Profile  
3. Return to Events  
4. Tap Messages/Profile again  

…the second open often fails.

Exact loops:
- Events → Messages → Events → Messages  
- Events → Profile → Events → Profile  
Also: cross (Messages↔Profile after Events), repeat many times, mobile touch + desktop click.

**Do not assume the nav element is broken.** Failure is tied to **returning to `/events`.**

---

## Two failed fixes already on `main` (do not redo)

| Commit | Change | Result |
|--------|--------|--------|
| `4abc9777` | `activatedThisGestureRef` reset in `handleClick` | Still broken |
| `06f009fa` (+ docs `77d19d72`/`969b2be6`) | Header `z-50`→`z-40`; render `AppNavigation` after chrome | Still broken |

**Review when shipping the real fix:**
- Keep stacking/`z-40` if still correct layering; do not expand it.
- Keep gesture-ref reset only as hygiene if still correct; it is **not** the root cause (AppNavigation remounts across Events↔Messages; refs do not survive).
- Remove either if they are pure workaround noise after the real fix.

---

## Architecture facts (needed for the trace)

- Bottom nav is `MobileNavTab` in `app/components/AppNavigation.tsx`.
- Messages + Profile are `isWorkspaceSelector: true` (`href` `/dm` and `/profile/:id`).
- Leave path is **only**:

```ts
// AppNavigation.tsx ~324–331
if (isWorkspaceSelector && isActive && pathname === href) {
  return; // pop-to-root no-op
}
router.push(href, { scroll: false });
```

- Touch: `pointerup` → `preventDefault()` + `navigate()`. If `navigate()` no-ops, suppressed click does **not** retry.
- `AppNavigation` is **not** in root layout. Events mounts it in `PlannerWorkspaceRouteLayout`; Messages/Profile mount their own. Events→Messages→Events **remounts** nav (component refs reset).
- Events’ `interceptWorkspaceTabNavigation` only affects **workspace sub-nav**, not bottom nav.
- Middleware does not bounce `/dm`↔`/events` on prod host.

---

## Strongest unproven-but-hard lead (start here)

### Classification target: prove **A / B / C / D / E**

| Code | Meaning |
|------|---------|
| **A** | Click never reaches nav |
| **B** | `navigate()` never runs / early-returns (pop-to-root) |
| **C** | `navigate()` runs; `router.push` does not commit |
| **D** | Route changes then redirects back to `/events` |
| **E** | Events leaves stale global state that blocks leaving |

### Why **B** is #1 right now

Pop-to-root uses **`usePathname()`** + prop `isActive` (also from `usePathname()` via `resolveNavItemActive`).

After soft-nav remounts, if React pathname still reports `/dm` (or `/profile/...`) while the UI/document is already on `/events`:
- Messages: `isActive === true` and `pathname === href` (`/dm`) → **silent no-op**
- Touch already `preventDefault`’d → dead tab

**Same class of bug already acknowledged in Events sub-nav** — `PlannerEventsSubNav.tsx` prefers `window.location.pathname` when `usePathname` lags:

```ts
// app/components/PlannerEventsSubNav.tsx ~39–44
const pathnameForSubNav =
  pathname && isPlannerEventsAreaPath(pathname)
    ? pathname
    : typeof window !== "undefined" && isPlannerEventsAreaPath(window.location.pathname)
      ? window.location.pathname
      : pathname;
```

Bottom nav does **not** have that compensation.

### #2 **C**

- Only soft path is `router.push`.
- Repo already hard-navigates away from some Events calendar-create URLs because “App Router client transitions are unreliable” (`lib/events/eventsListNavigation.ts` → `window.location.assign`).
- Events Active/History tabs use `window.history.pushState(window.history.state, "", href)` (`EventsPageClient.tsx`) — can desync Next history from the URL for later `router.push` rounds.

### Weak for the clean loop

- **D:** only if `?create=` replace-to-`/events` paths fire.
- **A:** stacking already fixed and still broken; remaining A candidate is `html[data-mobile-keyboard-open]` hiding `.ftc-mobile-nav-bar` (`globals.css`).
- **E:** create-chrome sessionStorage does not gate bottom nav.

---

## What to do (order)

1. **Prove A–E on one repro** (local with QA accounts, or Production). Minimal `[FTC-NAV-DEBUG]` logs around:
   - `MobileNavTab` pointerup / click / `navigate()` (log: href, `usePathname()`, `window.location.pathname`, `isActive`, whether early-return, whether `router.push` called)
   - pathname change
   - EventsPageClient mount/unmount
   - any `router.replace`/`push` on Events  
   Remove logs before final ship (or behind a dead flag).

2. **Discriminate:**
   - Tap logs `no-op (pop-to-root)` while Events list visible → **B**
   - Logs `navigate → /dm` and URL never changes → **C**
   - No pointerup/click → **A**
   - URL flips then returns → **D**

3. **Smallest fix for the proven path only.** Likely B fix shape (do not apply blindly — prove first):
   - Pop-to-root must use **document URL** (`window.location.pathname`), not stale `usePathname()`, e.g. no-op only when `window.location.pathname === href` (drop stale `isActive` from that gate, or derive active from window path).
   - Mirror the SubNav pathname-lag pattern; do not redesign nav.
   - If proven **C**: prefer the existing hard-nav escape hatch pattern only where soft-nav fails — still minimal.

4. Regression: assert pop-to-root does not no-op when `usePathname()` is stale vs `window.location` (source test and/or happy-dom). Update `scripts/test-regressions.mts` patterns that currently pin:

```ts
/if \(isWorkspaceSelector && isActive && pathname === href\)/
```

5. `npm run build` → commit on `cursor/<name>-5874` → QA the four loops → **merge/push `main`** → confirm Vercel Production READY for final SHA → confirm `followthecrowd.com.au` serves it.

6. Update `docs/handoff/CURRENT-STATE.md` (replace the “stacking fix solved it” narrative with the real cause).

---

## Key files

| File | Why |
|------|-----|
| `app/components/AppNavigation.tsx` | `MobileNavTab.navigate` / pointer / click — **primary** |
| `app/components/PlannerEventsSubNav.tsx` | Existing pathname-lag workaround to mirror |
| `app/(planner-workspace)/events/EventsPageClient.tsx` | `history.pushState`, create `replace`, intercept (sub-nav only) |
| `app/components/planner/PlannerWorkspaceLayout.tsx` | Shell + AppNavigation mount order |
| `lib/events/eventsListNavigation.ts` | Hard-nav precedent for unreliable soft-nav |
| `lib/navigation/mobileSoftwareKeyboard.ts` + `app/globals.css` | Nav `display:none` if keyboard flag stuck (A) |
| `scripts/test-regressions.mts` | Pins current pop-to-root source shape |

---

## Process / preferences (short)

- Brutal honesty; no agreement theatre (`USER-PREFERENCES.md`).
- Pre-code ladder: smallest fix; no new packages/helpers if one line works (`AGENTS.md`).
- Phone/desktop parity 390 / 1280 for UI (`FTC_WORKFLOW.md` §7).
- Do not stall Supabase; do not build debug infrastructure beyond tiny temporary logs.
- QA creds: `.env.qa.local` (gitignored) from `.env.qa.local.example`. Cursor cloud often lacks this file — use local Claude Code / machine with QA env if cloud has none.
- Never commit secrets. Never force-push `main`.

---

## Done means

- Proven letter **A–E** written in the ship summary with log/evidence  
- Minimal code fix for that path only  
- Prior failed fixes kept or removed with one-line rationale  
- Four nav loops + repeats pass (touch + click)  
- `npm run build` green; relevant regressions updated/pass  
- On Production: final main SHA + deployment READY + canonical domain serving it  

**Do not stop on another theory.**
