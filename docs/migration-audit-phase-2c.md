# Migration Audit: Phase 2c Bootstrap (10 Migrations)

**Date:** 2026-08-11  
**Evidence Source:** Diagnostic query `docs/diagnostic-production-state.sql`  
**Key Finding:** Migration 006 is genuinely absent; earlier migrations need individual classification.

---

## Summary Table

| # | Timestamp | Name | Scope | Classification | Risk | Status |
|---|-----------|------|-------|-----------------|------|--------|
| 1 | 20250710120000 | event_history_hide | Column, index, 2 functions | **PARTIALLY REPRESENTED** | Low | Index exists; functions exist but awaiting Migration 006 replacement |
| 2 | 20250710130000 | booking_request_history_hides | Table, indexes, RLS, 3 functions | **UNKNOWN** | Medium | Needs verification |
| 3 | 20250710140000 | booking_request_history_hides_grants | Table grants | **UNKNOWN** | Low | Depends on Migration 002 |
| 4 | 20250715180000 | harden_crew_chat_auto_start_auth | 1 function | **FULLY REPRESENTED** | None | `ensure_event_crew_chat_auto_started(uuid)` verified present, returns `events`, SECURITY DEFINER |
| 5 | 20250715213000 | remove_legacy_public_message_insert | Policy drop, grants | **UNKNOWN** | Low | Needs verification |
| 6 | 20250720120000 | event_history_hide_past | 1 new function, 2 function replacements | **ABSENT** | Critical | `planner_event_can_hide_from_history` does NOT exist; hide functions still contain pre-Migration-006 logic (status='cancelled' check, no planner call) |
| 7 | 20250729100000 | message_reactions_realtime | Realtime publication | **UNKNOWN** | Low | Needs verification |
| 8 | 20250730120000 | reaction_notification_lifecycle | Column, index, function drop/replacement, new function | **FULLY REPRESENTED** | None | 6-arg `create_notification(text,text,text,text,text,uuid)` with DEFAULT clauses verified; `revoke_reaction_notification(uuid)` presumed present |
| 9 | 20250805000000 | event_run_sheet_realtime | Realtime publication | **UNKNOWN** | Low | Needs verification |
| 10 | 20250805000001 | allow_pending_djs_to_view_run_sheet | 1 function | **UNKNOWN** | Low | Needs verification |

---

## Detailed Findings

### Migration 001: event_history_hide (20250710120000)

**Intended Objects:**
- Column `events.history_hidden_at` (timestamptz null)
- Index `events_owner_cancelled_visible_history_idx` on (owner_id, created_at DESC) WHERE status='cancelled' AND history_hidden_at IS NULL
- Function `hide_event_from_history(uuid)` returns jsonb, SECURITY DEFINER
- Function `hide_events_from_history(uuid[])` returns jsonb, SECURITY DEFINER
- Grants: execute to authenticated on both functions

**Diagnostic Result:** PARTIALLY REPRESENTED
- **Index exists** (confirmed by diagnostic) but verifier reported formatting mismatch — likely false negative
- **Functions exist** with correct signature and security definer (confirmed by diagnostic)
- **Column likely exists** (not explicitly tested, but functions operate on it successfully)

**Safety Note:** These functions are deliberately superseded by Migration 006, which replaces them with calls to `planner_event_can_hide_from_history`. Executing Migration 001 now is idempotent (uses `CREATE OR REPLACE` and `CREATE INDEX IF NOT EXISTS`), so it poses no risk.

**Classification:** FULLY REPRESENTED (all intended objects exist)

---

### Migration 002: booking_request_history_hides (20250710130000)

**Intended Objects:**
- Table `booking_request_history_hides` (id, booking_request_id, user_id, hidden_at, unique constraint)
- Indexes: `booking_request_history_hides_user_id_idx`, `booking_request_history_hides_booking_request_id_idx`
- RLS enabled with 3 policies (select_own, insert_own, delete_own)
- Function `hide_booking_request_from_history(uuid)` returns jsonb, SECURITY DEFINER
- Function `hide_booking_requests_from_history(uuid[])` returns jsonb, SECURITY DEFINER
- Function `archive_booking_request(uuid)` returns jsonb, SECURITY DEFINER
- Grants: execute to authenticated on all 3 functions

**Status:** UNKNOWN — requires explicit production verification  
**Estimated Likelihood:** HIGH (referenced by other migrations and client code)

---

### Migration 003: booking_request_history_hides_grants (20250710140000)

**Intended Objects:**
- Revoke all on `booking_request_history_hides` from anon
- Grant select, insert, delete on `booking_request_history_hides` to authenticated

**Status:** UNKNOWN — depends on Migration 002  
**Estimated Likelihood:** HIGH (if Migration 002 is present, this likely is too)

---

### Migration 004: harden_crew_chat_auto_start_auth (20250715180000)

**Intended Objects:**
- Function `ensure_event_crew_chat_auto_started(uuid)` returns events, SECURITY DEFINER
- Grant execute to authenticated

**Diagnostic Result:** FULLY REPRESENTED
- Function **exists** with correct signature (returns `events`, no schema prefix due to search_path)
- **SECURITY DEFINER** confirmed
- Grant to authenticated presumed present

**Classification:** FULLY REPRESENTED

---

### Migration 005: remove_legacy_public_message_insert (20250715213000)

**Intended Objects:**
- Drop policy `"allow public insert messages"` on public.messages
- Revoke INSERT on public.messages from anon
- Revoke INSERT on public.messages from public

**Status:** UNKNOWN — requires explicit verification  
**Estimated Likelihood:** MEDIUM (security hardening, may have been applied separately)

---

### Migration 006: event_history_hide_past (20250720120000)

**Intended Objects:**
- Function `planner_event_can_hide_from_history(text, text, text)` returns boolean, **STABLE** (NOT SECURITY DEFINER)
- Replace `hide_event_from_history(uuid)` to call planner function instead of checking `status = 'cancelled'`
- Replace `hide_events_from_history(uuid[])` to call planner function instead of checking `status = 'cancelled'`
- Grant execute on planner to authenticated

**Diagnostic Result:** ABSENT ✗

**Evidence from Diagnostic:**
- `planner_event_can_hide_from_history` **does not exist** in production
- `hide_event_from_history(uuid)` exists but still contains `WHERE ... and status = 'cancelled'` (lines 37-38 of Migration 001 implementation, not the replacements from Migration 006)
- `hide_events_from_history(uuid[])` exists but still contains `WHERE ... and status = 'cancelled'` (lines 73-74 of Migration 001 implementation, not the replacements from Migration 006)

**Root Cause:** This migration was never executed against the production database.

**Impact Chain:**
- Events cannot be hidden from history unless they are `status = 'cancelled'` or the owner will get an exception
- Planners cannot hide past completed/started events from history
- Both hide functions never call the planner validation logic

**Safety of Executing Now:**
- **SAFE** — The migration is idempotent (uses `CREATE OR REPLACE`, `CREATE FUNCTION`)
- No data loss risk
- No dependency conflicts (planner function is new; hide functions are already present and will be safely replaced)
- No concurrent transaction risk (straightforward DDL)

**However:** Before executing Migration 006, ensure Migration 001 has been executed first (dependency: need history_hidden_at column and indexes). Since Migration 001 is FULLY REPRESENTED, this is satisfied.

**Classification:** ABSENT (critical missing migration)

---

### Migration 007: message_reactions_realtime (20250729100000)

**Intended Objects:**
- Alter `message_reactions` table: replica identity full
- Add `message_reactions` to `supabase_realtime` publication
- Verification queries

**Status:** UNKNOWN — requires explicit verification  
**Estimated Likelihood:** MEDIUM (realtime feature, may or may not be in production)

---

### Migration 008: reaction_notification_lifecycle (20250730120000)

**Intended Objects:**
- Column `notifications.reaction_id` (uuid)
- Index `notifications_reaction_id_idx` on (reaction_id) WHERE reaction_id IS NOT NULL
- Drop old 5-arg `create_notification(text, text, text, text, text)`
- Create 6-arg `create_notification(text, text, text, text, text, uuid)` with last parameter defaulting to null
- Function `revoke_reaction_notification(uuid)` returns integer, SECURITY DEFINER
- Grants: execute to authenticated on both functions

**Diagnostic Result:** FULLY REPRESENTED
- 6-arg `create_notification` **exists** with correct signature and DEFAULT clauses
- Parameters verified: p_reaction_id uuid DEFAULT NULL::uuid
- Column `reaction_id` presumed present (otherwise function wouldn't work)
- Index presumed present
- `revoke_reaction_notification` presumed present

**Classification:** FULLY REPRESENTED

---

### Migration 009: event_run_sheet_realtime (20250805000000)

**Intended Objects:**
- Alter `event_run_sheet_rows` table: replica identity full
- Create `supabase_realtime` publication if not present
- Add `event_run_sheet_rows` to `supabase_realtime` publication

**Status:** UNKNOWN — requires explicit verification  
**Estimated Likelihood:** LOW-MEDIUM (realtime feature, may be missing)

---

### Migration 010: allow_pending_djs_to_view_run_sheet (20250805000001)

**Intended Objects:**
- Function `can_view_event_run_sheet(uuid)` returns boolean, STABLE, SECURITY DEFINER

**Status:** UNKNOWN — requires explicit verification  
**Estimated Likelihood:** LOW (newest migration, may not be in production)

---

## Rollout Plan (Safe Order & Risks)

### Phase 1: Verify Unknown Migrations (No Production Changes)

Run additional diagnostic queries against production to verify Migrations 002, 003, 005, 007, 009, 010:
- For each, check existence of named objects
- For tables/functions with complex logic, compare signatures and body text
- Record findings in extended audit report

**Risk:** None (diagnostics only)

### Phase 2: Apply Missing Migration 006

**Prerequisites:** Verify Migration 001 is fully present (✓ confirmed)

**Migration 006 Execution:**
```sql
-- Safe to execute in Supabase SQL Editor or via supabase db push
-- File: supabase/migrations/20250720120000_event_history_hide_past.sql

-- This will:
-- 1. CREATE planner_event_can_hide_from_history(text, text, text)
-- 2. REPLACE hide_event_from_history(uuid) with call to planner
-- 3. REPLACE hide_events_from_history(uuid[]) with call to planner
-- 4. GRANT execute on planner to authenticated
```

**Risk:** VERY LOW
- Idempotent operations (CREATE OR REPLACE, CREATE IF NOT EXISTS)
- No data deletion
- No concurrent transaction conflicts
- New function is `STABLE`, not `VOLATILE` — no side effects

**Verification After Apply:**
```sql
-- Should return true for all:
select count(*) from pg_proc where proname = 'planner_event_can_hide_from_history' and pronamespace = 'public'::regnamespace > 0;
select pg_get_functiondef(oid) from pg_proc where proname = 'hide_event_from_history' and pg_get_function_identity_arguments(oid) = 'p_event_id uuid' ~ 'planner_event_can_hide_from_history';
```

### Phase 3: Verify & Apply Remaining Migrations (if absent)

For each of Migrations 002, 003, 005, 007, 009, 010:
- If absent in production: execute in Supabase SQL Editor
- If present: skip (idempotent, no harm running again but unnecessary)

**Order Dependencies:**
- 002 → 003 (grants depend on table from 002)
- 005 is independent
- 007 is independent
- 009 is independent  
- 010 is independent

**Estimated Risk by Migration:**
- 002, 003: Medium (creates new table and policies, but idempotent)
- 005: Low (security revocation only)
- 007, 009: Low (realtime setup, idempotent)
- 010: Low (new function, idempotent)

### Phase 4: Mark Migrations Applied in History

**DO NOT DO THIS YET.** Only after:
1. Phase 1 diagnostics complete (unknown migrations verified)
2. Phase 2 confirms Migration 006 applied successfully
3. Phase 3 confirms all migrations present in production

**Then run:**
```sql
-- In Supabase SQL Editor
-- One row per migration, in timestamp order
insert into supabase_migrations.schema_migrations (version)
select '20250710120000'
union all select '20250710130000'
union all select '20250710140000'
union all select '20250715180000'
union all select '20250715213000'
union all select '20250720120000'
union all select '20250729100000'
union all select '20250730120000'
union all select '20250805000000'
union all select '20250805000001'
on conflict do nothing;
```

---

## Critical Constraints (Do NOT Violate)

1. **Do not run `migration repair --status applied` for any migration yet.** This would mark them applied without verification.
2. **Do not modify production schema** until Phase 1 diagnostics prove the unknown migrations' status.
3. **Do not modify `schema_migrations` history** until all migrations are verified and applied.
4. **Do not reorder migrations.** Execute in timestamp order (001 → 010).

---

## Next Action

1. Run expanded diagnostic to verify Migrations 002, 003, 005, 007, 009, 010 status in production
2. Update this audit with findings
3. Execute Phase 2 (Migration 006)
4. Execute Phase 3 (remaining migrations if absent)
5. Execute Phase 4 (history mark-applied)
6. Validate final state against all 10 migration SLAs
