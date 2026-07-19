# Handoff update checklist

**Mandatory:** when a Builder task is **completed** (build passes, commit/push if requested, or Isaac confirms done), update `docs/handoff/` before ending the session — even for small fixes if behaviour, routes, or workflow changed.

Read this after `HOW-WE-WORK.md`. Cursor rule: `.cursor/rules/handoff-update-on-ship.mdc`.

---

## Always update

| File | When | What to change |
|------|------|----------------|
| **`CURRENT-STATE.md`** | Any shipped feature, bugfix that changes UX, perf, routes, or data flow | Feature bullets, recent commits, `last updated` date |
| **`README.md`** | New handoff file added or process change | File table, fastest-start if needed |

## Update when relevant

| File | When |
|------|------|
| **`START-HERE-GPT.md`** | Product/roles/routes/copy conventions changed; major features shipped; ChatGPT needs fresh context |
| **`START-HERE-CURSOR.md`** | Cursor startup rules or read order changed |
| **`PROJECT.md`** | New key folders, lib files, or routes |
| **`HOW-WE-WORK.md`** | Roles, flow, or who-does-what changed |
| **`USER-PREFERENCES.md`** | Isaac's working style preferences changed |
| **`SUPABASE.md`** | New migration or `scripts/setup*.sql`; note if Isaac must run SQL |
| **`FTC_WORKFLOW.md`** | Builder/Reviewer/QA process changed |

Do **not** put secret values in handoff files (`SECRETS.md` stays pointers only).

---

## Minimum `CURRENT-STATE.md` update

1. Set `last updated: YYYY-MM-DD` at top.
2. Add or edit bullets under the right section (Events, Calendar, Booking, etc.).
3. Add commit hash + one-line summary under **Recent commits** (keep last ~8–10).
4. If new SQL: add row under **SQL / migrations Isaac may still need to run**.

---

## Skip handoff updates only when

- Pure question/review with **zero** code or doc changes, or
- Isaac explicitly says "no handoff update".

When in doubt, update `CURRENT-STATE.md` at minimum.

---

## Builder completion order

1. Implement + `npm run build` (if code changed)
2. Commit/push (if task requires)
3. **Update handoff docs** (this checklist)
4. Return summary including **Handoff updated:** list of files touched

For any UI, loading, or navigation change: confirm **phone (~390px) and desktop (~1280px) parity** per `FTC_WORKFLOW.md` §7 before marking complete.
