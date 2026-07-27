"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CompositionEvent, KeyboardEvent } from "react";
import { BookingRateField } from "@/app/components/BookingRateField";
import BookingFormField from "@/app/components/booking/BookingFormField";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
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
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
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
      setError("Enter a positive whole dollar amount.");
      return;
    }

    if (note.trim().length > MAX_NOTE_LENGTH) {
      setError(`Note must be ${MAX_NOTE_LENGTH} characters or fewer.`);
      return;
    }

    setError(null);

    try {
      await onSubmit(rateDigits, note.trim());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to send proposal.");
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
            {loading ? "Sending..." : "Send proposal"}
          </BookingSheetPrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <BookingRateField
          label="Proposed rate"
          value={rateDigits}
          onChange={setRateDigits}
          required
        />
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
        <p className="text-xs text-ftc-text-muted">
          {note.trim().length}/{MAX_NOTE_LENGTH}
        </p>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </BookingSheetDialog>
  );
}
