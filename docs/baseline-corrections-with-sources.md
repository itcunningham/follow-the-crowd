# Baseline Corrections: Exact Source Verification

**Date:** 2026-08-11  
**Purpose:** Document the exact source locations for the four critical baseline corrections before applying them to the SQL

---

## CORRECTION 1: proposed_rate Column Type

### Issue
Baseline defines: `proposed_rate numeric`  
Expected from source: `proposed_rate integer null`

### Source Location
**File:** `setupBookingRateProposal.sql`  
**Lines:** 4-9

```sql
alter table public.booking_requests
  add column if not exists rate_mode text not null default 'fixed',
  add column if not exists proposed_rate integer null,
  add column if not exists proposed_rate_note text null,
  add column if not exists proposed_rate_at timestamptz null,
  add column if not exists proposed_rate_status text null;
```

**Specific Detail:** Line 6 defines `proposed_rate integer null`

### Why This Matters
- The RPC function `propose_booking_rate()` (line 34) accepts `p_proposed_rate integer`
- The validation at line 55-56 says "must be a positive whole dollar amount"
- Using `numeric` in the baseline allows decimal values, breaking this contract
- Type mismatch causes client serialization issues and query performance divergence

### Proposed Fix
Change baseline line 111 from:
```sql
proposed_rate numeric,
```

To:
```sql
proposed_rate integer null,
```

### Verification
After applying, run:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='booking_requests' AND column_name='proposed_rate';
```
Expected result: `data_type = 'integer'`

---

## CORRECTION 2: Missing proposed_rate_note Column

### Issue
Baseline table definition (lines 95-114) does NOT include `proposed_rate_note`  
Expected from source: `proposed_rate_note text null`

### Source Location
**File:** `setupBookingRateProposal.sql`  
**Lines:** 4-9

```sql
alter table public.booking_requests
  add column if not exists rate_mode text not null default 'fixed',
  add column if not exists proposed_rate integer null,
  add column if not exists proposed_rate_note text null,
  add column if not exists proposed_rate_at timestamptz null,
  add column if not exists proposed_rate_status text null;
```

**Specific Detail:** Line 7 defines `proposed_rate_note text null`

### Why This Matters
The column is referenced in three places:

1. **Function propose_booking_rate()** (line 66): `proposed_rate_note = v_note`
2. **Function decline_proposed_booking_rate()** (line 150): `proposed_rate_note = null`
3. **Constraint check** (lines 28-30): validates `char_length(proposed_rate_note) <= 250`

Without this column, the RPC functions will fail on UPDATE operations.

### Proposed Fix
Add to baseline `booking_requests` table definition after `proposed_rate_status`:
```sql
proposed_rate_note text null,
```

### Verification
After applying, run:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='booking_requests' AND column_name='proposed_rate_note';
```
Expected result: 1 row returned

---

## CORRECTION 3: rate_mode Default and NOT NULL Constraint

### Issue
Baseline defines: `rate_mode text` (no default, nullable)  
Expected from source: `rate_mode text not null default 'fixed'`

### Source Location
**File:** `setupBookingRateProposal.sql`  
**Line:** 5

```sql
alter table public.booking_requests
  add column if not exists rate_mode text not null default 'fixed',
```

**Specific Detail:** Line 5 requires `not null default 'fixed'`

### Why This Matters
- The RPC `propose_booking_rate()` (line 72) checks `rate_mode = 'open'` to allow proposals
- Without a default, existing bookings have NULL rate_mode, breaking this logic
- Default 'fixed' means "sender specifies fee" (the standard case)
- NOT NULL constraint is required to enforce valid state

### Proposed Fix
Change baseline line 110 from:
```sql
rate_mode text,
```

To:
```sql
rate_mode text not null default 'fixed',
```

### Verification
After applying, run:
```sql
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name='booking_requests' AND column_name='rate_mode';
```
Expected result:
- is_nullable = NO
- column_default = 'fixed'::text

---

## CORRECTION 4: Missing Three Constraints

### Issue
Baseline has NO constraints on rate_mode, proposed_rate_status, or proposed_rate_note  
Expected from source: Three CHECK constraints from setupBookingRateProposal.sql

### Source Location
**File:** `setupBookingRateProposal.sql`  
**Lines:** 11-30

```sql
alter table public.booking_requests
  drop constraint if exists booking_requests_rate_mode_check;

alter table public.booking_requests
  add constraint booking_requests_rate_mode_check
  check (rate_mode in ('fixed', 'open'));

alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_status_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_status_check
  check (proposed_rate_status is null or proposed_rate_status in ('pending', 'accepted', 'declined'));

alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_note_length_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_note_length_check
  check (proposed_rate_note is null or char_length(proposed_rate_note) <= 250);
```

### Why This Matters
- Without these constraints, the database accepts invalid values for rate columns
- RPC functions check these values in application logic, creating a security gap if direct SQL bypasses RLS
- Data integrity depends on database-level enforcement

### Three Constraints to Add

#### Constraint 3A: rate_mode values
**Source:** setupBookingRateProposal.sql lines 11-16
```sql
alter table public.booking_requests
  drop constraint if exists booking_requests_rate_mode_check;

alter table public.booking_requests
  add constraint booking_requests_rate_mode_check
  check (rate_mode in ('fixed', 'open'));
```
**Purpose:** Only 'fixed' (specified fee) or 'open' (DJ proposes) are valid

#### Constraint 3B: proposed_rate_status values
**Source:** setupBookingRateProposal.sql lines 18-23
```sql
alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_status_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_status_check
  check (proposed_rate_status is null or proposed_rate_status in ('pending', 'accepted', 'declined'));
```
**Purpose:** Status of rate proposal can be null, 'pending', 'accepted', or 'declined'

#### Constraint 3C: proposed_rate_note length
**Source:** setupBookingRateProposal.sql lines 25-30
```sql
alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_note_length_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_note_length_check
  check (proposed_rate_note is null or char_length(proposed_rate_note) <= 250);
```
**Purpose:** DJ's note on rate proposal limited to 250 characters (enforced by RPC line 60)

### Proposed Fix
Add all three constraint blocks to baseline after the existing `booking_requests_status_check` constraint (after line 121)

### Verification
After applying, run:
```sql
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name='booking_requests' AND constraint_type='CHECK'
AND constraint_name IN ('booking_requests_rate_mode_check',
                         'booking_requests_proposed_rate_status_check',
                         'booking_requests_proposed_rate_note_length_check');
```
Expected result: 3 rows returned

---

## SUMMARY: All Four Corrections

| Correction | Type | Location | Fix | Source |
|-----------|------|----------|-----|--------|
| 1. proposed_rate type | Type mismatch | Line 111 | Change `numeric` to `integer null` | setupBookingRateProposal.sql line 6 |
| 2. proposed_rate_note column | Missing column | Line 113 (insert) | Add `proposed_rate_note text null` | setupBookingRateProposal.sql line 7 |
| 3. rate_mode default | Missing default/constraint | Line 110 | Change `text` to `text not null default 'fixed'` | setupBookingRateProposal.sql line 5 |
| 4. Three rate constraints | Missing constraints | After line 121 | Add 3 ALTER TABLE constraint blocks | setupBookingRateProposal.sql lines 14-30 |

**Source:** All four corrections are source-verified from setupBookingRateProposal.sql lines 4-30

**Status:** Ready to apply to baseline once user reviews and approves

