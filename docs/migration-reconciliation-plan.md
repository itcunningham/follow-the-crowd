# Migration Reconciliation Plan: Final 10-Migration Map & Runbook

**Date:** 2026-08-11  
**Status:** Read-only audit complete; ready for execution phase  
**Evidence:** Diagnostic queries `diagnostic-production-state.sql` and `diagnostic-unknown-migrations.sql`

---

## Executive Summary

Production schema contains artifacts from 9 of 10 migrations (001–005, 007–010). **Migration 006 is uniquely absent** while later migrations 007–010 already exist and do not depend on it. All 10 migrations can be safely represented in schema_migrations history; Migration 006 can be safely executed against current production without conflicts.

**Critical decision point:** Execute Migration 006 before or immediately after repairing history?  
**Answer:** Execute first (safer), then repair history for all 10 in correct order.

---

## Final Migration Classification

| # | Timestamp | Name | Scope | Classification | Represented | Safe to Repair | Notes |
|---|-----------|------|-------|-----------------|-----------|---|---|
| 1 | 20250710120000 | event_history_hide | Column, index, 2 functions | PARTIALLY REPRESENTED | ✓ | YES | Pre-Migration-006 state; awaits replacement |
| 2 | 20250710130000 | booking_request_history_hides | Table, indexes, RLS, 3 functions | **FULLY REPRESENTED** | ✓ | YES | All objects confirmed present |
| 3 | 20250710140000 | booking_request_history_hides_grants | Grants to authenticated | **FULLY REPRESENTED** | ✓ | YES | Grants present; additional privileges (TRUNCATE/REFERENCES/TRIGGER) from elsewhere, do NOT revoke |
| 4 | 20250715180000 | harden_crew_chat_auto_start_auth | 1 function | **FULLY REPRESENTED** | ✓ | YES | Function present, correct signature and security |
| 5 | 20250715213000 | remove_legacy_public_message_insert | Policy drop, grants revoke | **FULLY REPRESENTED** | ✓ | YES | Legacy policy removed; INSERT revoked as intended |
| 6 | 20250720120000 | event_history_hide_past | 1 new function, 2 replacements | **ABSENT** | ✗ | NO (yet) | Planner function missing; requires execution before history repair |
| 7 | 20250729100000 | message_reactions_realtime | Realtime publication | **FULLY REPRESENTED** | ✓ | YES | Full replica identity + publication membership confirmed |
| 8 | 20250730120000 | reaction_notification_lifecycle | Column, index, functions | **FULLY REPRESENTED** | ✓ | YES | 6-arg create_notification + revoke function confirmed |
| 9 | 20250805000000 | event_run_sheet_realtime | Realtime publication | **FULLY REPRESENTED** | ✓ | YES | Full replica identity + publication membership confirmed |
| 10 | 20250805000001 | allow_pending_djs_to_view_run_sheet | 1 function | **FULLY REPRESENTED** | ✓ | YES | Function present with pending/accepted logic confirmed |

---

## Migration 006 Safety Analysis

### Current State
- `planner_event_can_hide_from_history(text, text, text)` **does not exist**
- `hide_event_from_history(uuid)` exists but contains pre-006 logic: `WHERE ... and status = 'cancelled'`
- `hide_events_from_history(uuid[])` exists but contains pre-006 logic: `WHERE ... and status = 'cancelled'`

### Dependencies & Preconditions
Migration 006 requires:
- ✓ `events` table with `history_hidden_at` column (provided by Migration 001, confirmed present)
- ✓ `hide_event_from_history(uuid)` function exists (confirmed present)
- ✓ `hide_events_from_history(uuid[])` function exists (confirmed present)
- ✓ No `planner_event_can_hide_from_history` function already present (confirmed)

### Compatibility with Migrations 007–010
- Migration 007 (message_reactions_realtime): No dependency on Migration 006. ✓ Safe
- Migration 008 (reaction_notification_lifecycle): No dependency on Migration 006. ✓ Safe
- Migration 009 (event_run_sheet_realtime): No dependency on Migration 006. ✓ Safe
- Migration 010 (allow_pending_djs_to_view_run_sheet): No dependency on Migration 006. ✓ Safe

**Conclusion:** Executing the original Migration 006 SQL against production (which already has 007–010) is **safe**. No migration conflicts; idempotent operations (CREATE OR REPLACE, CREATE IF NOT EXISTS).

### What Executing Migration 006 Will Do
1. **CREATE** `planner_event_can_hide_from_history(text, text, text)` → new function
2. **REPLACE** `hide_event_from_history(uuid)` → will call planner function instead of checking `status = 'cancelled'`
3. **REPLACE** `hide_events_from_history(uuid[])` → will call planner function instead of checking `status = 'cancelled'`
4. **GRANT** execute on planner to authenticated

### Risk Level: **VERY LOW**
- Idempotent (safe to re-run)
- No data modification
- No DROP statements (no destructive operations)
- Functions updated in place (no signature changes)
- All replacements are function definitions, not structural changes
- No concurrent transaction conflicts
- Post-006 behavior: events can be hidden from history if (a) cancelled, (b) past date, or (c) today AND completed

---

## Proposed Execution Runbook

### Phase A: Apply Migration 006 (Before History Repair)

**Why first?** Because schema_migrations will be the source of truth after repair. Executing 006 before marking it applied ensures production state matches what the migration claims to have done.

**Command:**
```bash
# Paste the contents of supabase/migrations/20250720120000_event_history_hide_past.sql
# into Supabase SQL Editor and execute
# OR
supabase db push --linked
# (if migrations are configured to push automatically)
```

**Verification after execute:**
```sql
-- All three should return true:
select exists(
  select 1 from pg_proc where proname = 'planner_event_can_hide_from_history'
  and pronamespace = 'public'::regnamespace
);

select pg_get_functiondef(oid) ~ 'planner_event_can_hide_from_history'
from pg_proc where proname = 'hide_event_from_history'
and pg_get_function_identity_arguments(oid) = 'p_event_id uuid' limit 1;

select pg_get_functiondef(oid) ~ 'planner_event_can_hide_from_history'
from pg_proc where proname = 'hide_events_from_history'
and pg_get_function_identity_arguments(oid) = 'p_event_ids uuid[]' limit 1;
```

**Rollback if needed:**
If Migration 006 fails (unlikely given analysis above):
```sql
-- Manually drop the planner function (if partially created)
drop function if exists public.planner_event_can_hide_from_history(text, text, text) cascade;
-- And revert the hide functions using Supabase backup/restore
```

---

### Phase B: Repair Migration History (After 006 Is Applied)

Once 006 is confirmed in production, mark all 10 migrations as applied in schema_migrations table:

```sql
insert into supabase_migrations.schema_migrations (version)
values
  ('20250710120000'),
  ('20250710130000'),
  ('20250710140000'),
  ('20250715180000'),
  ('20250715213000'),
  ('20250720120000'),
  ('20250729100000'),
  ('20250730120000'),
  ('20250805000000'),
  ('20250805000001')
on conflict do nothing;

-- Verify all 10 rows exist:
select version from supabase_migrations.schema_migrations
where version in ('20250710120000', '20250710130000', '20250710140000',
  '20250715180000', '20250715213000', '20250720120000', '20250729100000',
  '20250730120000', '20250805000000', '20250805000001')
order by version;
```

**Why insert to schema_migrations (not `migration repair --status applied`)?**  
The `migration repair` command is Supabase CLI's high-level operation. Direct SQL insert is safer here because:
1. It's explicit (you can see exactly what's being recorded)
2. It's repeatable (on conflict do nothing handles idempotence)
3. No CLI version dependencies

---

### Phase C: Create Baseline Migration (After All 10 Are Marked Applied)

Once all 10 migrations are in schema_migrations and production schema matches their cumulative intent, create a baseline migration:

```sql
-- File: supabase/migrations/20250101000000_baseline_phase2c.sql
-- This is a read-only audit of Phase 2c schema state after all 10 migrations

-- (Include verification queries from docs/verify-production-migrations.sql)
-- This serves as documentation and rollback reference
```

**Purpose of baseline:**
- Proves current schema state is correct
- Serves as reference for future migrations
- Allows fast verification that Phase 2c state is intact

**Note:** Because 20250101... is earlier than all 10 migrations (202507... onwards), Supabase will skip it when the 10 are already applied. It becomes a verification document, not an executed migration.

---

## Timeline & Decision Points

| Step | Action | Decision | Timeline |
|------|--------|----------|----------|
| 1 | Execute Migration 006 | Manual SQL in Supabase Editor | Once user confirms safe |
| 2 | Verify 006 in production | Run verification queries | Immediate after step 1 |
| 3 | Repair schema_migrations | Insert 10 rows (all 10 now present) | After 006 verified |
| 4 | Verify final state | Run full 50-check verification script | After step 3 |
| 5 | Document baseline | Create read-only baseline migration | After step 4 |

---

## Critical Constraints (MUST NOT VIOLATE)

1. **Do not repair history before Migration 006 is applied.** Otherwise schema_migrations claims 006 is applied when it isn't.
2. **Do not execute Migration 006 directly via `db push`.** It should be manual first so you can verify before committing to history.
3. **Do not modify `supabase_migrations.schema_migrations` except via the explicit INSERT shown above.** Do not use `migration repair --status applied` without understanding what it does.
4. **Do not create a new "reconciliation" version of Migration 006.** Execute the original unchanged; it's idempotent and safe.
5. **Do not skip Migration 001–005 in the history repair.** All 10 must be recorded, even if some were applied long ago.

---

## Why This Order Matters

```
Current state:
  Production schema = 001 + 002 + 003 + 004 + 005 + 007 + 008 + 009 + 010
  schema_migrations = (empty or partial)

Danger: If we repair history BEFORE 006:
  schema_migrations would claim 001–010 applied
  But 006 isn't actually in production schema
  `db push` would see "006 is in migrations/ but marked applied" and skip it
  → 006 stays absent; history is a lie

Safe order:
  1. Execute 006 in production → schema now = 001–010
  2. Then repair history → schema_migrations records what's true
  3. Now `db push` sees all 10 are applied and schema_migrations agrees ✓
```

---

## Post-Reconciliation State

After all three phases complete:
- ✓ Production schema contains all 10 migration artifacts
- ✓ `supabase_migrations.schema_migrations` records all 10 as applied
- ✓ History and reality are aligned
- ✓ `supabase migration list` shows all 10 as `[up to date]`
- ✓ Future `db push` operations will only apply new migrations (011+)
- ✓ Baseline migration 20250101... serves as verification reference

---

## Rollback Strategy (If Needed)

**If any phase fails:**

1. **Phase A fails (Migration 006 doesn't execute):**
   - No impact to earlier migrations
   - Production remains in pre-006 state
   - Do NOT proceed to Phase B
   - Investigate the failure; 006 is idempotent so check logs for WHY it failed

2. **Phase B fails (history repair has errors):**
   - Schema is correct (Phase A worked)
   - Some rows in schema_migrations may be missing or incorrect
   - Delete the inserted rows: `delete from supabase_migrations.schema_migrations where version in ('20250710120000', ...)`
   - Investigate; re-run Phase B with troubleshooting

3. **Phase C (baseline) is optional documentation:**
   - Failure here has no impact on production or history
   - Can be created/skipped independently

---

## Next Action

**Do not execute anything yet.** This plan is ready for user approval. Once confirmed:

1. User manually executes Migration 006 SQL in Supabase Editor
2. Sends back verification that 006 applied successfully
3. We then proceed with Phase B (history repair)
4. We then proceed with Phase C (baseline documentation)

All three phases will be explicit SQL commands or bash calls, executable by the user in their own time.
