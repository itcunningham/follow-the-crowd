# Baseline Local Test Sequence

**Objective:** Verify that baseline + migrations 001–010 apply cleanly on a fresh local database and produce the expected final schema.

**Scope:** Local validation only (using `supabase db reset` or `supabase stop && supabase start --local`). Do NOT modify production.

---

## Prerequisites

1. **Supabase CLI** installed and available on PATH
2. **Local Supabase project** initialized (`supabase/` directory with `.env.local`)
3. **Migration files** present in `supabase/migrations/`:
   - `20250101000000_baseline_phase2c.sql` (baseline — ready for creation once approved)
   - `20250710120000_event_history_hide.sql` (Migration 001)
   - `20250710130000_booking_request_history_hides.sql` (Migration 002)
   - `20250710140000_booking_request_history_hides_grants.sql` (Migration 003)
   - `20250715180000_harden_crew_chat_auto_start_auth.sql` (Migration 004)
   - `20250715213000_remove_legacy_public_message_insert.sql` (Migration 005)
   - `20250720120000_event_history_hide_past.sql` (Migration 006)
   - `20250729100000_message_reactions_realtime.sql` (Migration 007)
   - `20250730120000_reaction_notification_lifecycle.sql` (Migration 008)
   - `20250805000000_event_run_sheet_realtime.sql` (Migration 009)
   - `20250805000001_allow_pending_djs_to_view_run_sheet.sql` (Migration 010)
4. **pgTAP tests** in `tests/` directory (42 total tests as previously verified)

---

## Test Sequence

### Phase 1: Fresh Database Reset

**Objective:** Ensure a clean slate with no leftover schema or history.

**Command:**
```bash
supabase stop --local
rm -rf /path/to/supabase/.branches  # Clear branches cache
rm -rf /path/to/supabase/.temp      # Clear temp files
supabase start --local
```

**Expected Outcome:**
- Supabase local services start cleanly
- Local PostgreSQL database is created fresh
- `schema_migrations` table exists (Supabase internal)
- No migration history yet (`select count(*) from schema_migrations` returns 0)

**Verification Command:**
```bash
supabase db query --local "select count(*) as migration_count from schema_migrations;"
```

**Expected Result:**
```
migration_count
───────────────
              0
```

---

### Phase 2: Apply Baseline Migration

**Objective:** Verify baseline applies cleanly and creates all prerequisite schema without conflicts.

**Command:**
```bash
supabase db push --local
```

**Expected Outcome:**
- Baseline migration (`20250101000000_baseline_phase2c.sql`) applies without errors
- `schema_migrations` now contains 1 row: `20250101000000`
- All 11 core tables created (users, booking_plans, booking_requests, conversations, conversation_members, events, messages, message_reactions, notifications, event_run_sheet_columns, event_run_sheet_rows)
- All 8 helper functions created (auth_user_id, is_conversation_member, is_conversation_participant, is_event_crew_participant, count_event_accepted_crew_djs, is_event_run_sheet_owner, start_dm, create_notification 5-arg)
- RLS enabled on all 11 tables
- 14+ RLS policies created
- Function grants to authenticated role in place

**Verification Command (Count Tables):**
```bash
supabase db query --local "select count(*) as table_count from information_schema.tables where table_schema = 'public';"
```

**Expected Result:**
```
table_count
───────────
         11
```

**Verification Command (Count Helper Functions):**
```bash
supabase db query --local "
  select count(*) as func_count
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public'
    and p.proname in ('auth_user_id', 'is_conversation_member', 'is_conversation_participant', 
                      'is_event_crew_participant', 'count_event_accepted_crew_djs', 
                      'is_event_run_sheet_owner', 'start_dm', 'create_notification');
"
```

**Expected Result:**
```
func_count
──────────
         8
```

**Verification Command (RLS Enabled):**
```bash
supabase db query --local "
  select count(*) as rls_count
  from pg_class c
  join pg_namespace n on c.relnamespace = n.oid
  where n.nspname = 'public'
    and c.relrowsecurity = true
    and c.relkind = 'r';
"
```

**Expected Result:**
```
rls_count
─────────
       11
```

**Verification Command (Migration History):**
```bash
supabase migration list --local
```

**Expected Result:**
```
Local        Remote  Status
────────────────────────────
20250101000000  -     ↑ (uncommitted)
```

---

### Phase 3: Apply Migrations 001–010

**Objective:** Verify all 10 production migrations apply in correct order without conflicts.

**Command:**
```bash
supabase db push --local --include-all
```

**Expected Outcome:**
- All 10 migrations apply sequentially without errors
- `schema_migrations` now contains 11 rows: baseline + 10 migrations
- Migration 001 creates `events.history_hidden_at` column and helper functions
- Migration 002 creates `booking_request_history_hides` table
- Migration 003 grants permissions on `booking_request_history_hides`
- Migration 004 creates `ensure_event_crew_chat_auto_started` function
- Migration 005 removes legacy `allow public insert messages` policy
- Migration 006 creates `planner_event_can_hide_from_history` function and replaces hide functions
- Migration 007 sets `message_reactions` replica identity to FULL and adds to publication
- Migration 008 replaces `create_notification` with 6-arg version, drops 5-arg, adds `revoke_reaction_notification`
- Migration 009 sets `event_run_sheet_rows` replica identity to FULL and adds to publication
- Migration 010 creates `can_view_event_run_sheet` function

**Verification Command (Migration History):**
```bash
supabase migration list --local
```

**Expected Result:**
```
Local                Remote  Status
──────────────────────────────────
20250101000000         -     ↑
20250710120000         -     ↑
20250710130000         -     ↑
20250710140000         -     ↑
20250715180000         -     ↑
20250715213000         -     ↑
20250720120000         -     ↑
20250729100000         -     ↑
20250730120000         -     ↑
20250805000000         -     ↑
20250805000001         -     ↑
```

(All local, none on remote yet, which is correct for a fresh test database.)

**Verification Command (history_hidden_at Column):**
```bash
supabase db query --local "
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'events' and column_name = 'history_hidden_at';
"
```

**Expected Result:**
```
column_name       | data_type
──────────────────┼───────────
history_hidden_at | timestamp
```

**Verification Command (planner_event_can_hide_from_history Exists):**
```bash
supabase db query --local "
  select proname, pg_get_functiondef(oid)
  from pg_proc p
  where proname = 'planner_event_can_hide_from_history'
    and p.pronamespace = 'public'::regnamespace;
"
```

**Expected Result:**
```
proname                            | pg_get_functiondef
───────────────────────────────────┼─(function definition containing user_id, role, status params, returns boolean STABLE)
planner_event_can_hide_from_history | ...
```

**Verification Command (6-arg create_notification Exists):**
```bash
supabase db query --local "
  select proname, pg_get_function_identity_arguments(oid)
  from pg_proc p
  where proname = 'create_notification'
    and p.pronamespace = 'public'::regnamespace;
"
```

**Expected Result:**
```
proname             | pg_get_function_identity_arguments
────────────────────┼──────────────────────────────────────
create_notification | p_user_id text, p_type text, p_title text, p_body text, p_link text, p_reaction_id uuid
```

**Verification Command (message_reactions Replica Identity FULL):**
```bash
supabase db query --local "
  select relreplident::text
  from pg_class c
  join pg_namespace n on c.relnamespace = n.oid
  where n.nspname = 'public' and c.relname = 'message_reactions';
"
```

**Expected Result:**
```
relreplident
────────────
f
```

(where 'f' = FULL replica identity)

**Verification Command (event_run_sheet_rows in Publication):**
```bash
supabase db query --local "
  select exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'event_run_sheet_rows'
  ) as in_publication;
"
```

**Expected Result:**
```
in_publication
──────────────
t
```

---

### Phase 4: Run pgTAP Tests

**Objective:** Verify all 42 tests pass against the migrated schema.

**Command:**
```bash
supabase test db --local
```

**Expected Outcome:**
- All 42 pgTAP tests pass
- Test summary shows: `42 passed, 0 failed`
- No warnings or errors

**Expected Result Summary:**
```
Testing...

✓ 42 tests passed
✓ 0 tests failed
✓ All tests passed
```

---

### Phase 5: Verify Schema State Against Production

**Objective:** Confirm local schema matches current production schema (same 11 migrations applied).

**Command (Count All Objects by Type):**
```bash
supabase db query --local "
  select
    'tables' as object_type,
    (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')::text as count
  union all
  select
    'indexes',
    (select count(*) from pg_indexes where schemaname = 'public')::text
  union all
  select
    'functions',
    (select count(*) from pg_proc p join pg_namespace n on p.pronamespace = n.oid where n.nspname = 'public' and p.prokind = 'f')::text
  union all
  select
    'policies',
    (select count(*) from pg_policies where schemaname = 'public')::text
  order by object_type;
"
```

**Expected Result** (approximately):
```
object_type | count
────────────┼──────
functions   | ~30+
indexes     | ~20+
policies    | ~15+
tables      | 11
```

(Exact counts will depend on system functions; focus on presence of key objects, not exact counts.)

---

## Rollback Strategy (If Any Step Fails)

### If Phase 1 (Fresh Reset) Fails

1. Verify Supabase local services are running: `supabase status`
2. If services won't start, check logs: `docker logs supabase_db_local` (if using Docker)
3. Restart services: `supabase stop && supabase start --local`
4. Retry Phase 1

### If Phase 2 (Baseline Apply) Fails

1. Check error message from `supabase db push --local`
2. If error is SQL syntax, edit `20250101000000_baseline_phase2c_proposed.sql` and retry
3. If error is constraint violation, verify baseline doesn't conflict with pre-existing schema
4. Rollback: `supabase db reset --local` and retry from Phase 1

### If Phase 3 (Migrations Apply) Fails

1. Check error message from `supabase db push --local --include-all`
2. If error is in a specific migration, check that migration's SQL syntax
3. If error is dependency-related (e.g., function not found), verify preceding migrations applied
4. Rollback: `supabase db reset --local` and retry from Phase 1
5. Do NOT apply migrations manually in SQL Editor — always use `db push`

### If Phase 4 (pgTAP Tests) Fails

1. Run tests with verbose output: `supabase test db --local -- --verbose`
2. Check which specific tests fail
3. Investigate whether the test expectation or the schema is wrong
4. If schema is wrong, identify which migration caused the failure
5. Fix the migration SQL, commit, and retry from Phase 1

### If Phase 5 (Schema Verification) Fails

1. Compare object counts with production diagnostic results
2. Identify which object types are missing (tables, indexes, policies, functions)
3. Trace back to which migration should have created them
4. Verify that migration is present and applied (check Phase 3 verification)
5. If migration is missing, re-run Phase 3

---

## Success Criteria

✓ Phase 1: Fresh database reset completes with 0 migrations in history  
✓ Phase 2: Baseline migration applies; `schema_migrations` shows 1 row (baseline)  
✓ Phase 3: All 10 migrations apply in order; `schema_migrations` shows 11 rows total  
✓ Phase 4: All 42 pgTAP tests pass  
✓ Phase 5: Schema state matches expected count of core tables, indexes, functions, policies  

---

## Next Steps (After Approval)

1. User reviews proposed baseline SQL (in review)
2. User approves baseline SQL (if no changes needed)
3. Create baseline migration file: `supabase/migrations/20250101000000_baseline_phase2c.sql`
4. Execute local test sequence (Phases 1–5 above)
5. If all phases succeed, generate summary report
6. Once baseline is confirmed safe, apply to production via `supabase db push --linked` (separate approval gate)
7. Mark baseline as applied in production `schema_migrations` (separate step)
8. Update handoff documentation (docs/handoff/)

---

## Timeline

- Baseline review: user review required
- Test execution: ~10–15 minutes (dependent on local hardware and Supabase startup time)
- Test verification: ~5 minutes per phase
- Total estimated time: ~1 hour (including Supabase service startup/shutdown)

