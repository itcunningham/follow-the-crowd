-- REQUIRED SQL CORRECTIONS FOR BASELINE
-- These corrections must be applied to 20250101000000_baseline_phase2c_corrected.sql
-- before production promotion.

-- ============================================================================
-- CORRECTION 1: Fix proposed_rate type from numeric to integer
-- ============================================================================
-- CURRENT (INCORRECT - line 111):
--   proposed_rate numeric,
--
-- REQUIRED (CORRECT):
--   proposed_rate integer null,
--
-- SOURCE: setupBookingRateProposal.sql line 6
--
-- RATIONALE: RPC function propose_booking_rate() accepts integer and validates
--   "must be a positive whole dollar amount" (line 55-56). Database should match.

-- APPLY IN BASELINE DIRECTLY: Replace line 111 in booking_requests table definition


-- ============================================================================
-- CORRECTION 2: Add missing proposed_rate_note column
-- ============================================================================
-- CURRENT BASELINE: booking_requests table (lines 95-114) is missing this column
--
-- REQUIRED: Add column after proposed_rate_status in table definition:
--   proposed_rate_note text null,
--
-- SOURCE: setupBookingRateProposal.sql line 7
--
-- RATIONALE: RPC function propose_booking_rate() sets this column (line 66).
--   Function decline_proposed_booking_rate() resets it (line 150).
--   Without this column, migrations and RPCs will fail.

-- APPLY IN BASELINE: Add to booking_requests table definition (around line 112-113)


-- ============================================================================
-- CORRECTION 3: Add three missing constraints on booking_requests
-- ============================================================================
-- These constraints should be added AFTER the booking_requests table definition
-- and AFTER the status_check constraint (line 121)

-- CONSTRAINT 3A: rate_mode values
-- SOURCE: setupBookingRateProposal.sql lines 14-16
alter table public.booking_requests
  drop constraint if exists booking_requests_rate_mode_check;

alter table public.booking_requests
  add constraint booking_requests_rate_mode_check
  check (rate_mode in ('fixed', 'open'));

-- CONSTRAINT 3B: proposed_rate_status values
-- SOURCE: setupBookingRateProposal.sql lines 21-23
alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_status_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_status_check
  check (proposed_rate_status is null or proposed_rate_status in ('pending', 'accepted', 'declined'));

-- CONSTRAINT 3C: proposed_rate_note length
-- SOURCE: setupBookingRateProposal.sql lines 28-30
alter table public.booking_requests
  drop constraint if exists booking_requests_proposed_rate_note_length_check;

alter table public.booking_requests
  add constraint booking_requests_proposed_rate_note_length_check
  check (proposed_rate_note is null or char_length(proposed_rate_note) <= 250);


-- ============================================================================
-- CORRECTION VERIFICATION: Compare with setupBookingRateProposal.sql
-- ============================================================================
-- After applying corrections, the baseline booking_requests should have:
--
-- COLUMNS:
--   id, created_at, sender_id, recipient_id, conversation_id, event_id,
--   event_name, venue, event_date, set_time, fee, notes, status,
--   archived_at, rate_mode, proposed_rate, proposed_rate_note,
--   proposed_rate_at, proposed_rate_status
--
-- CONSTRAINTS:
--   PRIMARY KEY (id)
--   FOREIGN KEY (conversation_id) -> conversations(id)
--   FOREIGN KEY (event_id) -> events(id)
--   CHECK (status in ('pending', 'accepted', 'declined', 'cancelled'))
--   CHECK (rate_mode in ('fixed', 'open'))
--   CHECK (proposed_rate_status is null or proposed_rate_status in ('pending', 'accepted', 'declined'))
--   CHECK (proposed_rate_note is null or char_length(proposed_rate_note) <= 250)
--
-- INDEXES:
--   booking_requests_conversation_id_idx
--   booking_requests_sender_id_idx
--   booking_requests_event_id_idx


-- ============================================================================
-- OPTIONAL ENHANCEMENTS (not required but recommended)
-- ============================================================================

-- Consider adding these for clarity:

-- Add comments documenting baseline-only tables:
-- COMMENT ON TABLE public.conversations IS
--   'DM conversations. Defined in baseline only; not in any setup script.';
-- COMMENT ON TABLE public.conversation_members IS
--   'DM conversation membership. Defined in baseline only; not in any setup script.';
-- COMMENT ON TABLE public.messages IS
--   'DM and crew chat messages. Defined in baseline only; not in any setup script.';

-- Document the unknown-source function:
-- COMMENT ON FUNCTION public.count_event_accepted_crew_djs(uuid) IS
--   'Count accepted crew DJs for an event. Source: inferred from event_run_sheet RLS. '
--   'Verify migrations 001-010 to confirm usage.';

-- Add column comments for proposed_rate fields:
-- COMMENT ON COLUMN public.booking_requests.rate_mode IS
--   'Rate type: fixed (specified) or open (DJ proposes). Source: setupBookingRateProposal.';
-- COMMENT ON COLUMN public.booking_requests.proposed_rate IS
--   'Proposed rate in whole dollars (integer). Set by DJ when rate_mode=open. '
--   'Sender can accept to override fee. Source: setupBookingRateProposal.';
-- COMMENT ON COLUMN public.booking_requests.proposed_rate_note IS
--   'Optional note from DJ with rate proposal (max 250 chars). Source: setupBookingRateProposal.';
-- COMMENT ON COLUMN public.booking_requests.proposed_rate_at IS
--   'When DJ submitted the rate proposal. Source: setupBookingRateProposal.';
-- COMMENT ON COLUMN public.booking_requests.proposed_rate_status IS
--   'Status of rate proposal: pending, accepted, declined. Source: setupBookingRateProposal.';


-- ============================================================================
-- TESTING CHECKLIST AFTER CORRECTIONS
-- ============================================================================
-- 1. Verify proposed_rate is integer:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name='booking_requests' AND column_name='proposed_rate';
--    EXPECTED: data_type = 'integer'
--
-- 2. Verify proposed_rate_note exists:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name='booking_requests' AND column_name='proposed_rate_note';
--    EXPECTED: 1 row returned
--
-- 3. Verify constraints exist:
--    SELECT constraint_name FROM information_schema.table_constraints
--    WHERE table_name='booking_requests' AND constraint_type='CHECK'
--    AND constraint_name IN ('booking_requests_rate_mode_check',
--                             'booking_requests_proposed_rate_status_check',
--                             'booking_requests_proposed_rate_note_length_check');
--    EXPECTED: 3 rows returned
--
-- 4. Verify RPC functions can execute:
--    SELECT pg_get_functiondef('public.propose_booking_rate'::regprocedure);
--    SELECT pg_get_functiondef('public.accept_proposed_booking_rate'::regprocedure);
--    SELECT pg_get_functiondef('public.decline_proposed_booking_rate'::regprocedure);
--    EXPECTED: All return function bodies without error
--
-- 5. Test constraint enforcement:
--    -- This should FAIL (invalid rate_mode):
--    INSERT INTO public.booking_requests (..., rate_mode, ...)
--    VALUES (..., 'invalid', ...);
--    EXPECTED ERROR: violates check constraint "booking_requests_rate_mode_check"
--
--    -- This should FAIL (proposed_rate_note > 250 chars):
--    INSERT INTO public.booking_requests (..., proposed_rate_note, ...)
--    VALUES (..., REPEAT('x', 251), ...);
--    EXPECTED ERROR: violates check constraint "booking_requests_proposed_rate_note_length_check"


-- ============================================================================
-- MIGRATION COMPATIBILITY
-- ============================================================================
-- After corrections, migrations 001-010 should execute without:
--   - Column not found errors for proposed_rate_note
--   - Type mismatch errors on proposed_rate
--   - Constraint violation errors from proposed_rate values
--
-- Key migrations that depend on these corrections:
--   - 008 (reaction_notification_lifecycle.sql) - uses create_notification with proposed_rate fields
--   - All DM migrations - depend on message, conversation, conversation_members tables
