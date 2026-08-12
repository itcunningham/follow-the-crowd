# Migration Reconciliation Plan: Final 10-Migration Map & Execution Runbook (Revised)

**Date:** 2026-08-11  
**Status:** Read-only audit complete; ready for execution phase  
**Evidence:** Diagnostic queries `diagnostic-production-state.sql` and `diagnostic-unknown-migrations.sql`  
**Architecture:** Use Supabase migration machinery (not SQL Editor) to keep schema and history coupled

---

## Executive Summary

Production schema contains artifacts from 9 of 10 migrations (001–005, 007–010). **Migration 006 is uniquely absent** while later migrations 007–010 already exist and do not depend on it. 

**Safe sequence:**
1. Repair history for only the 9 verified-present migrations (leaving 006 unrecorded)
2. Verify via `supabase migration list` that 006 is the only local migration absent remotely
3. Use `supabase db push --include-all --dry-run` to confirm only 006 would execute
4. Apply 006 through Supabase migration machinery (not SQL Editor)
5. Create and verify baseline migration (prerequisite schema for fresh-database bootstrap)

This approach keeps schema changes coupled to migration history and never bypasses the migration system.

---

## Final Migration Classification

| # | Timestamp | Name | Classification | Represented | In History | Notes |
|---|-----------|------|-----------------|-----------|-----------|---|
| 1 | 20250710120000 | event_history_hide | PARTIALLY REPRESENTED | ✓ | TO DO | Pre-Migration-006 state; awaits replacement |
| 2 | 20250710130000 | booking_request_history_hides | FULLY REPRESENTED | ✓ | TO DO | All objects confirmed present |
| 3 | 20250710140000 | booking_request_history_hides_grants | FULLY REPRESENTED | ✓ | TO DO | Grants present; do NOT revoke additional privileges |
| 4 | 20250715180000 | harden_crew_chat_auto_start_auth | FULLY REPRESENTED | ✓ | TO DO | Function present, correct signature and security |
| 5 | 20250715213000 | remove_legacy_public_message_insert | FULLY REPRESENTED | ✓ | TO DO | Legacy policy removed; INSERT revoked as intended |
| 6 | 20250720120000 | event_history_hide_past | **ABSENT** | ✗ | TO DO (deferred) | Planner function missing; apply via `db push --include-all` after history repair |
| 7 | 20250729100000 | message_reactions_realtime | FULLY REPRESENTED | ✓ | TO DO | Full replica identity + publication membership confirmed |
| 8 | 20250730120000 | reaction_notification_lifecycle | FULLY REPRESENTED | ✓ | TO DO | 6-arg create_notification + revoke function confirmed |
| 9 | 20250805000000 | event_run_sheet_realtime | FULLY REPRESENTED | ✓ | TO DO | Full replica identity + publication membership confirmed |
| 10 | 20250805000001 | allow_pending_djs_to_view_run_sheet | FULLY REPRESENTED | ✓ | TO DO | Function present with pending/accepted logic confirmed |

---

## Why This Sequence Is Safer

```
Previous (wrong) approach:
  1. Execute 006 manually in SQL Editor → schema changes, history unchanged
  2. Mark history applied → schema and history now coupled, but we bypassed migrations
  Problem: Reinforces the exact workflow that created this mess

Revised (correct) approach:
  1. Mark only 001–005, 007–010 as applied in history
  2. Verify via CLI that 006 is the only missing migration
  3. Use `db push --include-all` to apply 006 through migrations
  4. Verify both schema and history updated together
  Result: Schema changes and history stay coupled; migration machinery is used consistently
```

---

## Phase A: Repair History for 9 Verified Migrations

**Purpose:** Record in `schema_migrations` that migrations 001–005 and 007–010 have been applied, leaving 006 deliberately unrecorded.

**Important:** `migration repair --status applied` only modifies the tracking table. It does not execute any SQL. This is the correct tool for marking already-applied schema changes in history.

**Commands (sequential; user must review and approve before execution):**

```bash
supabase migration repair --status applied 20250710120000
supabase migration repair --status applied 20250710130000
supabase migration repair --status applied 20250710140000
supabase migration repair --status applied 20250715180000
supabase migration repair --status applied 20250715213000
supabase migration repair --status applied 20250729100000
supabase migration repair --status applied 20250730120000
supabase migration repair --status applied 20250805000000
supabase migration repair --status applied 20250805000001
```

**After these 9 commands:**
- `schema_migrations` table will contain 9 rows (timestamps for 001–005, 007–010)
- `20250720120000` (Migration 006) will NOT be in the table yet
- Production schema is unchanged (these are metadata-only operations)

---

## Phase B: Verify Migration List Shows 006 as Missing

**Purpose:** Confirm via Supabase CLI that only Migration 006 is absent from history.

**Command:**
```bash
supabase migration list
```

**Expected output:**
```
Local        Remote         Status
────────────────────────────────────────────────
20250710120000  20250710120000  ✓
20250710130000  20250710130000  ✓
20250710140000  20250710140000  ✓
20250715180000  20250715180000  ✓
20250715213000  20250715213000  ✓
20250720120000  -              (missing on remote)
20250729100000  20250729100000  ✓
20250730120000  20250730120000  ✓
20250805000000  20250805000000  ✓
20250805000001  20250805000001  ✓
```

**Key requirement:** Migration 006 must be the ONLY local migration absent remotely. If any others show as missing, investigate before proceeding.

---

## Phase C: Dry-Run Deployment Using Supabase Migration Machinery

**Purpose:** Prove that applying pending migrations will execute only Migration 006 against production, with no unintended side effects.

**Command:**
```bash
supabase db push --linked --include-all --dry-run
```

The `--include-all` flag ensures that even though 006 has an earlier timestamp than already-recorded migrations, it will be included in the deployment check.

**Expected output:**
```
Deploying migrations from ... to ...
[dry-run] Will apply:
  20250720120000_event_history_hide_past.sql
[dry-run] Completed
```

**Key requirement:** Only `20250720120000_event_history_hide_past.sql` should be listed as pending. If any other migrations appear as pending, **do NOT proceed**—investigate why.

---

## Phase D: Apply Migration 006 via Supabase Migration Machinery

**Purpose:** Execute Migration 006 through `supabase db push`, keeping schema and history coupled.

**Command (only after Phase B and C validation):**
```bash
supabase db push --linked --include-all
```

This will:
1. Execute the SQL from `20250720120000_event_history_hide_past.sql` against production
2. Record in `schema_migrations` that migration 006 was applied
3. Update the remote migration history automatically

**Verification immediately after:**

Run the Phase C dry-run command again; it should now show no pending migrations:
```bash
supabase db push --linked --dry-run
```

Expected: `[dry-run] No migrations to apply`

---

## Phase E: Verify Production State After Migration 006

**Purpose:** Confirm that Migration 006 executed successfully and production schema matches expectations.

**Run the full diagnostic:**
```bash
supabase db query --linked --file docs/diagnostic-production-state.sql
```

**Key checks that should pass:**
- `planner_event_can_hide_from_history` exists with correct signature
- `hide_event_from_history(uuid)` function body contains call to planner
- `hide_events_from_history(uuid[])` function body contains call to planner
- Grants on planner function exist for authenticated role

**If any check fails:** Migration 006 was not applied correctly. Investigate logs; do NOT proceed to Phase F.

---

## Phase F: Final Verification — All 10 Migrations in History

**Purpose:** Confirm all 10 migrations are now recorded and no local/remote mismatch exists.

**Command:**
```bash
supabase migration list
```

**Expected output:** All 10 timestamps appear with Local == Remote and ✓ status:
```
20250710120000  20250710120000  ✓
20250710130000  20250710130000  ✓
20250710140000  20250710140000  ✓
20250715180000  20250715180000  ✓
20250715213000  20250715213000  ✓
20250720120000  20250720120000  ✓
20250729100000  20250729100000  ✓
20250730120000  20250730120000  ✓
20250805000000  20250805000000  ✓
20250805000001  20250805000001  ✓
```

---

## Phase G: Create Baseline Migration (NOT YET — Design Phase Only)

**Purpose:** Create a prerequisite/baseline migration that represents the schema required BEFORE Migration 001 executes. This enables fresh-database bootstrap: `migration reset` or fresh deploy will start from the baseline and apply migrations 001–010 on top.

### What the Baseline Must Contain

The baseline migration must include all schema objects required by Migration 001 to execute successfully. These are the "prerequisites" declared in Migration 001's header:

```
-- Prerequisites: setupEvents.sql, setupProductionRls.sql
```

From Phase 2a/2b infrastructure setup (outside Phase 2c scope), the baseline must include:

1. **Core tables:** `public.events`, `public.users`, `public.booking_requests`, `public.conversations`, etc.
2. **Core functions:** `public.auth_user_id()`, `public.is_conversation_member()`, `public.start_dm()`, `public.create_notification()`, etc.
3. **Core RLS setup:** Policies and grants from `setupProductionRls.sql`
4. **Storage buckets:** `profile-images` bucket configuration

### What the Baseline Must NOT Contain

The baseline must NOT include anything that Migration 001 creates:
- `events.history_hidden_at` column (Migration 001 adds this)
- `events_owner_cancelled_visible_history_idx` index (Migration 001 creates this)
- `hide_event_from_history()` / `hide_events_from_history()` functions (Migration 001 creates these)
- Any schema from Migrations 002–010

### Baseline Design Process (Deferred)

1. Audit current production schema to identify what existed BEFORE Migration 001
2. Extract that schema using Supabase tools or `pg_dump` with object filtering
3. Create `20250101000000_baseline_phase2c.sql` with that schema
4. Test the baseline: fresh `migration reset` + apply all 10 migrations should recreate current production state
5. Commit baseline to repository
6. Mark baseline as applied in production history (only after verification)

**Status:** Deferred pending completion of Phases A–F and schema audit of pre-001 prerequisites.

---

## Critical Constraints (MUST NOT VIOLATE)

1. **Use `migration repair --status applied` only for the 9 verified migrations.** Do not include 006 until it's actually applied.
2. **Use Supabase migration machinery (`db push`) to apply 006, not SQL Editor.** Decoupling schema from history is what created this situation.
3. **Verify `migration list` output between each phase.** This is your safety net proving migrations and history are in sync.
4. **Run `--dry-run` before the actual `db push`.** Confirm only 006 appears as pending.
5. **Do NOT create the baseline migration yet.** Design and audit are deferred until after Migration 006 is confirmed.
6. **Do NOT mark the baseline as applied until its contents are verified against production schema.** This happens in a separate Phase G (not included in current runbook).

---

## Rollback Strategy (If Needed)

**If Phase A fails (migration repair commands error):**
- These are metadata-only operations; rerun the failing command
- If the table gets corrupted, restore from Supabase backup

**If Phase C dry-run shows unexpected migrations:**
- **DO NOT PROCEED.** Something is wrong with local migration files or remote state
- Investigate why additional migrations appear as pending
- Do NOT run `db push --include-all` until only 006 appears pending

**If Phase D fails (db push errors on 006):**
- Migration 006 has an issue applying to current production state
- Check logs for the specific error
- Investigate whether production state differs from expectations (unlikely given diagnostics)
- Do NOT rerun `db push --include-all` repeatedly; investigate first

**If Phase E diagnostics show 006 not applied:**
- Check `db push` logs for warnings or partial execution
- Verify Migration 006 SQL is syntactically correct
- Revert to pre-006 state from backup if needed
- Investigate the failure before retrying

---

## Timeline & Approval Gates

| Phase | Action | Approval Gate | Timeline |
|-------|--------|---------------|----------|
| A | Repair history for 9 migrations | User reviews 9 `migration repair` commands | Before execution |
| B | Verify migration list | User views output showing 006 missing | Immediate after A |
| C | Dry-run deployment | User views dry-run showing only 006 | Before Phase D |
| D | Apply 006 via db push | User confirms Phase C output | When ready |
| E | Verify production state | Diagnostics confirm 006 applied | Immediately after D |
| F | Verify all 10 in history | `migration list` shows all 10 ✓ | Immediately after E |
| G | Create baseline (deferred) | Schema audit + verification | After F; separate approval |

---

## Next Action

**Do NOT execute anything yet.**

Before running Phase A (`migration repair` commands), user must:
1. Review the 9 `migration repair` commands above
2. Confirm understanding that these only modify `schema_migrations`, not production schema
3. Approve execution of these 9 commands explicitly

Once approved, we proceed sequentially through Phases A–F. Phase G (baseline) is designed but deferred pending completion of earlier phases.
