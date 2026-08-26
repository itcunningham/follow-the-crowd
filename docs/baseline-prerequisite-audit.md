# Baseline Migration Prerequisite Audit

**Objective:** Identify minimal pre-001 schema required for migrations 001–010 to apply cleanly on a fresh database.

**Scope:** Do NOT include anything created by migrations 001–010; only core infrastructure needed before they run.

---

## Dependency Analysis: What Each Migration Requires

### Migration 001: event_history_hide (20250710120000)
**Declares prerequisite:** setupEvents.sql, setupProductionRls.sql

**Objects it creates:**
- Column: `events.history_hidden_at`
- Index: `events_owner_cancelled_visible_history_idx`
- Functions: `hide_event_from_history(uuid)`, `hide_events_from_history(uuid[])`
- Grants: execute to authenticated

**Objects it assumes exist:**
- Table: `public.events` (with id, owner_id, status columns)
- Function: `public.auth_user_id()`
- Table RLS enabled on `public.events`

### Migration 002: booking_request_history_hides (20250710130000)
**Declares prerequisite:** setupBookingRequests.sql, setupBookingCancellation.sql, setupBookingRequestArchiving.sql

**Objects it creates:**
- Table: `booking_request_history_hides`
- Indexes, RLS, policies, functions

**Objects it assumes exist:**
- Table: `public.booking_requests` (with id column)
- Column: `public.booking_requests.archived_at` (from setupBookingRequestArchiving.sql)

### Migration 003: booking_request_history_hides_grants (20250710140000)
**Objects it assumes exist:**
- Table: `public.booking_request_history_hides` (created by Migration 002)

### Migration 004: harden_crew_chat_auto_start_auth (20250715180000)
**Objects it creates:**
- Function: `ensure_event_crew_chat_auto_started(uuid)`

**Objects it assumes exist:**
- Table: `public.events` (with crew_chat_started_at, status columns)
- Function: `public.auth_user_id()`
- Function: `public.is_event_crew_participant(uuid, text)`
- Function: `public.count_event_accepted_crew_djs(uuid)`

### Migration 005: remove_legacy_public_message_insert (20250715213000)
**Objects it assumes exist:**
- Table: `public.messages` (with RLS and policies)

### Migration 006: event_history_hide_past (20250720120000)
**Objects it creates:**
- Function: `public.planner_event_can_hide_from_history(text, text, text)`
- Replaces: `hide_event_from_history(uuid)`, `hide_events_from_history(uuid[])`

**Objects it assumes exist:**
- Table: `public.events` (from Migration 001)
- Functions: `hide_event_from_history(uuid)`, `hide_events_from_history(uuid[])` (from Migration 001)

### Migration 007: message_reactions_realtime (20250729100000)
**Objects it assumes exist:**
- Table: `public.message_reactions`
- Publication: `supabase_realtime` (may not exist, migration creates it)

### Migration 008: reaction_notification_lifecycle (20250730120000)
**Objects it creates:**
- Column: `notifications.reaction_id`
- Index: `notifications_reaction_id_idx`
- Functions: `create_notification(6-arg)`, `revoke_reaction_notification(uuid)`
- Drops: 5-arg `create_notification`

**Objects it assumes exist:**
- Table: `public.notifications` (with existing 5-arg create_notification)
- Table: `public.message_reactions` (referenced in logic)

### Migration 009: event_run_sheet_realtime (20250805000000)
**Objects it assumes exist:**
- Table: `public.event_run_sheet_rows`
- Publication: `supabase_realtime`

### Migration 010: allow_pending_djs_to_view_run_sheet (20250805000001)
**Objects it creates:**
- Function: `can_view_event_run_sheet(uuid)`

**Objects it assumes exist:**
- Table: `public.booking_requests` (with event_id, recipient_id, status columns)

---

## Core Tables Required Before Migration 001

From tracing dependencies, these tables must exist:

1. **public.users** — User identity and authentication
   - Columns: user_id (text), ...(profile fields)
   - Requires: auth integration (Supabase Auth)

2. **public.booking_plans** — DJ pricing/availability templates
   - Columns: id (uuid), owner_id (text), ...
   - Requires: FK to users or auth.users

3. **public.booking_requests** — Booking offer/request records
   - Columns: id (uuid), sender_id (text), recipient_id (text), event_id (uuid), status (text), archived_at (timestamptz)
   - Requires: FK to users/auth, setupBookingCancellation.sql, setupBookingRequestArchiving.sql

4. **public.events** — Event/gig records
   - Columns: id (uuid), owner_id (text), status (text), crew_chat_started_at (timestamptz), ...(details)
   - Requires: auth_user_id() function, RLS enabled
   - Created by: setupEvents.sql

5. **public.conversations** — DM conversation records
   - Columns: id (uuid)
   - Requires: RLS enabled

6. **public.conversation_members** — DM conversation membership
   - Columns: conversation_id (uuid), user_id (text)
   - Requires: RLS enabled

7. **public.messages** — DM and crew chat messages
   - Columns: id (uuid), conversation_id (uuid), user_id (text), event_id (uuid), body (text), ...(attachments)
   - Requires: RLS enabled with hardened policies

8. **public.notifications** — User notifications
   - Columns: id (uuid), user_id (text), type (text), title (text), body (text), link (text), read (boolean), reaction_id (uuid DEFAULT null), created_at (timestamptz)
   - Requires: RLS enabled, 5-arg create_notification(uuid) function

9. **public.message_reactions** — Emoji reactions on messages
   - Columns: id (uuid), message_id (uuid), user_id (text), emoji (text), created_at (timestamptz)
   - Requires: RLS enabled, replica identity full (for Realtime)

10. **public.event_run_sheet_rows** — DJ crew assignment sheet
    - Columns: id (uuid), event_id (uuid), dj_id (text), ...(timing/role info)
    - Requires: RLS enabled, replica identity full (for Realtime)

---

## Core Functions Required Before Migration 001

1. **public.auth_user_id()** — Return current authenticated user's ID
   - Returns: text (user ID from auth.uid())
   - Used by: RLS policies in all tables, RPC functions

2. **public.is_conversation_member(uuid)** — Check if user is member of conversation
   - Parameters: conversation_id (uuid)
   - Returns: boolean
   - Used by: RLS, RPC functions

3. **public.is_event_crew_participant(uuid, text)** — Check if user is crew participant
   - Parameters: event_id (uuid), user_id (text)
   - Returns: boolean
   - Used by: Migration 004, 010, RLS policies

4. **public.count_event_accepted_crew_djs(uuid)** — Count accepted crew DJs
   - Parameters: event_id (uuid)
   - Returns: integer
   - Used by: Migration 004

5. **public.is_event_run_sheet_owner(uuid)** — Check if user owns event run sheet
   - Parameters: event_id (uuid)
   - Returns: boolean
   - Used by: Migration 010

6. **public.start_dm(text)** — Create or return 1:1 DM conversation
   - Parameters: target_user_id (text)
   - Returns: uuid (conversation_id)
   - Security: definer, requires is_conversation_participant()
   - Used by: Client code

7. **public.create_notification(text, text, text, text, text)** — 5-arg version
   - Parameters: user_id, type, title, body, link
   - Returns: uuid (notification_id)
   - Security: definer
   - Used by: DM/booking/crew chat flows (will be replaced by 6-arg in Migration 008)

---

## RLS Policies Required Before Migration 001

All tables need RLS enabled with authenticated-only policies:

- `public.users`: select all, update own, insert own
- `public.booking_plans`: select own, insert own, update own, delete own
- `public.booking_requests`: select if participant, insert if sender, update if recipient
- `public.events`: select if owner or invited, insert if owner, update if owner, delete if owner
- `public.conversations`: select if member
- `public.conversation_members`: select if member of conversation
- `public.messages`: select if in conversation, insert if sender and member, update if member
- `public.notifications`: select own, update own
- `public.message_reactions`: select if in conversation, insert if sender, update if sender

All anon role should be revoked (SELECT to public for public.users only).

---

## Grants Required Before Migration 001

- USAGE on schema public to authenticated role
- EXECUTE on all helper functions to authenticated role
- TABLE grants (SELECT/INSERT/UPDATE/DELETE) to authenticated role where appropriate
- REVOKE all on sensitive tables from anon role

---

## Storage Buckets Required

1. **profile-images** — User profile images
   - Public read, authenticated upload/delete own folder

2. **event-covers** — Event cover images
   - Authenticated upload/delete own folder

---

## Proposed Baseline Migration Contents

File: `supabase/migrations/20250101000000_baseline_phase2c.sql`

**Scope:** Idempotent baseline that represents the schema state BEFORE Migration 001 executes.

**Includes:**
1. Core table definitions (users, booking_plans, booking_requests, events, conversations, conversation_members, messages, notifications, message_reactions, event_run_sheet_rows)
2. All required columns and constraints (NOT history_hidden_at — that's Migration 001)
3. RLS enabled on all tables
4. RLS policies for authenticated-only access
5. Helper functions (auth_user_id, is_conversation_member, is_event_crew_participant, count_event_accepted_crew_djs, is_event_run_sheet_owner, start_dm)
6. 5-arg create_notification function (will be replaced by 6-arg in Migration 008)
7. Grants to authenticated role
8. Storage bucket definitions
9. Publication (supabase_realtime) created if not present

**Does NOT include:**
- history_hidden_at column or events_owner_cancelled_visible_history_idx (Migration 001)
- booking_request_history_hides table (Migration 002)
- booking_request_history_hides grants (Migration 003)
- ensure_event_crew_chat_auto_started function (Migration 004)
- Policy drops/grant revokes (Migration 005)
- planner_event_can_hide_from_history function (Migration 006)
- message_reactions replica identity changes (Migration 007)
- reaction_id column or 6-arg create_notification (Migration 008)
- event_run_sheet_rows replica identity changes (Migration 009)
- can_view_event_run_sheet function (Migration 010)

---

## Fresh Database Test Plan

**Objective:** Verify baseline + 10 migrations produce the expected schema on a fresh database.

### Test Scenario 1: Local Fresh Database

```bash
# Create fresh local database with Supabase CLI
supabase db reset

# Verify baseline applied
supabase db query --file docs/verify-baseline-baseline.sql

# Verify all 10 migrations applied
supabase migration list

# Verify final schema matches production
supabase db query --file docs/verify-production-migrations.sql
```

### Test Scenario 2: GitHub CI Fresh Database

Add to CI workflow:
```yaml
- name: Test fresh database with migrations
  run: |
    supabase start
    supabase db reset
    supabase migration list
    supabase db query --file docs/verify-production-migrations.sql
```

### Test Scenario 3: Baseline Verification

Verify the baseline migration can be applied to a schema that already has all 10 migrations (idempotence):

```bash
# On production (or staging with copy of production)
supabase db push --linked --dry-run
# Should return: No migrations to apply
# (because all 10 are already recorded and the baseline with timestamp 20250101 would be skipped)
```

### Test Scenario 4: Partial Migration Sequence

Verify migrations apply in correct order:

```bash
# Create fresh database
supabase db reset

# Step 1: Apply baseline only
supabase migration list  # Should show all 10 as pending
supabase db query --file docs/verify-baseline-schema.sql  # All core tables exist

# Step 2: Apply migrations 1-5
# (use CLI to apply just those timestamps if possible, or manually run first 5 migration files)

# Step 3: Verify intermediate state
supabase db query --file docs/verify-migrations-001-005.sql  # Check expected objects

# Step 4: Apply migrations 6-10
# Step 5: Verify final state matches production
```

---

## Critical Constraints for Baseline

1. **Must be idempotent.** Using `IF NOT EXISTS`, `CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`, etc.

2. **Must NOT conflict with migrations 001–010.** No objects that those migrations also create (especially history_hidden_at, planner_event_can_hide_from_history, booking_request_history_hides, etc.).

3. **Must include ALL prerequisite objects.** Missing a single function or column will cause Migration 001+ to fail.

4. **All tables must have RLS enabled.** Migrations assume this.

5. **All helper functions must exist with correct signatures.** Migration functions depend on them.

6. **Must NOT execute any DATA operations.** Baseline is schema-only.

---

## Next Steps

1. **Audit**: Review the setup scripts to extract exact table/column/function definitions
2. **Extract**: Generate baseline SQL from setupEvents.sql, setupProductionRls.sql, setup*.sql
3. **Validate**: Ensure baseline can apply to fresh database without errors
4. **Test**: Run fresh-database test scenarios (above) to verify baseline + 10 migrations work
5. **Approve**: User reviews baseline design before migration file is created

---

## Questions for User

Before proceeding to extract and generate the baseline migration:

1. **Setup scripts scope**: Should baseline pull from ALL setup*.sql scripts, or only the ones explicitly listed as prerequisites (setupEvents.sql, setupProductionRls.sql, setupAuthUsers.sql, setupBookingPlans.sql, etc.)?

2. **Storage buckets**: Should baseline include storage bucket definitions, or are those typically configured outside migrations?

3. **Auth integration**: Should baseline assume Supabase Auth is already enabled, or should it create auth roles?

4. **Grants specificity**: Should baseline grant TABLE permissions explicitly, or rely on schema-level grants?

5. **Test environment**: For fresh-database test plan, should we test locally with `supabase db reset` or create a separate test database in Supabase?
