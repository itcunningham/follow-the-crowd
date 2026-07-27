"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CompositionEvent, KeyboardEvent } from "react";
import { BookingRateField } from "@/app/components/BookingRateField";
import BookingFormField from "@/app/components/booking/BookingFormField";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import { PlannerFieldError } from "@/app/components/planner/PlannerUi";
import { isPositiveWholeDollarRate } from "@/lib/bookingRate";
import {
  applyCappedMultilineInputLimit,
  shouldBlockMultilineEnter,
} from "@/lib/cappedMultilineInput";
import {
  PROPOSE_RATE_HELPER_DESCRIPTION,
  resolveProposeRateHelperVisibility,
} from "@/lib/booking/proposeRateHelperPreference";

const MAX_NOTE_LENGTH = 250;
const MAX_NOTE_LINES = 3;

function applyProposalNoteInputLimit(currentNote: string, nextNote: string): string | null {
  return applyCappedMultilineInputLimit(currentNote, nextNote, MAX_NOTE_LINES, MAX_NOTE_LENGTH);
}

function ProposeRateSubmitSpinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function ProposeBookingRateSheet({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (rateDigits: string, note: string) => Promise<void>;
}) {
  const [rateDigits, setRateDigits] = useState("");
  const [note, setNote] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [showHelper, setShowHelper] = useState(false);
  const recordedOpenRef = useRef(false);
  const isComposingNoteRef = useRef(false);

  useLayoutEffect(() => {
    if (!open) {
      recordedOpenRef.current = false;
      setShowHelper(false);
      return;
    }

    if (recordedOpenRef.current) {
      return;
    }

    recordedOpenRef.current = true;
    setShowHelper(resolveProposeRateHelperVisibility());
  }, [open]);

  useEffect(() => {
    if (!open) {
      setRateDigits("");
      setNote("");
      setRateError(null);
      setNoteError(null);
    }
  }, [open]);

  function handleNoteChange(nextNote: string) {
    if (isComposingNoteRef.current) {
      setNote(nextNote);
      return;
    }

    const limited = applyProposalNoteInputLimit(note, nextNote);

    if (limited !== null) {
      setNote(limited);
    }
  }

  function handleNoteKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (shouldBlockMultilineEnter(note, MAX_NOTE_LINES)) {
      event.preventDefault();
    }
  }

  function handleNoteCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
    isComposingNoteRef.current = false;

    const limited = applyProposalNoteInputLimit(note, event.currentTarget.value);

    if (limited !== null) {
      setNote(limited);
    }
  }

  async function handleSubmit() {
    if (!isPositiveWholeDollarRate(rateDigits)) {
      setRateError("Enter a positive whole dollar amount");
      setNoteError(null);
      return;
    }

    if (note.trim().length > MAX_NOTE_LENGTH) {
      setNoteError(`Note must be ${MAX_NOTE_LENGTH} characters or fewer`);
      setRateError(null);
      return;
    }

    setRateError(null);
    setNoteError(null);

    try {
      await onSubmit(rateDigits, note.trim());
    } catch (submitError) {
      setNoteError(submitError instanceof Error ? submitError.message : "Failed to send proposal");
    }
  }

  function handleRateChange(nextRateDigits: string) {
    setRateDigits(nextRateDigits);

    if (rateError) {
      setRateError(null);
    }
  }

  return (
    <BookingSheetDialog
      open={open}
      title="Propose rate"
      titleId="propose-booking-rate-title"
      description={showHelper ? PROPOSE_RATE_HELPER_DESCRIPTION : undefined}
      loading={loading}
      onBackdropClick={onClose}
      footer={
        <>
          <BookingSheetSecondaryButton disabled={loading} onClick={onClose}>
            Cancel
          </BookingSheetSecondaryButton>
          <BookingSheetPrimaryButton disabled={loading} onClick={() => void handleSubmit()}>
            <span className="inline-flex min-w-[5.5rem] items-center justify-center gap-2">
              {loading ? (
                <>
                  <ProposeRateSubmitSpinner />
                  Sending
                </>
              ) : (
                "Send"
              )}
            </span>
          </BookingSheetPrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <BookingRateField
            label="Proposed rate"
            value={rateDigits}
            onChange={handleRateChange}
            required
          />
          {rateError ? <PlannerFieldError message={rateError} /> : null}
        </div>
        <div>
          <BookingFormField
            label="Notes (optional)"
            value={note}
            onChange={handleNoteChange}
            placeholder="Notes"
            multiline
            textareaRows={1}
            textareaClassName="ftc-fixed-scroll-textarea ftc-fixed-scroll-textarea-3"
            textareaOnKeyDown={handleNoteKeyDown}
            textareaOnCompositionStart={() => {
              isComposingNoteRef.current = true;
            }}
            textareaOnCompositionEnd={handleNoteCompositionEnd}
          />
          {noteError ? <PlannerFieldError message={noteError} /> : null}
          <p className="mt-1 text-xs text-ftc-text-muted">
            {note.trim().length}/{MAX_NOTE_LENGTH}
          </p>
        </div>
      </div>
    </BookingSheetDialog>
  );
}
