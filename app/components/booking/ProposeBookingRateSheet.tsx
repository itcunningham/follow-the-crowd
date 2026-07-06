"use client";

import { useEffect, useState } from "react";
import { BookingRateField } from "@/app/components/BookingRateField";
import BookingFormField from "@/app/components/booking/BookingFormField";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import { isPositiveWholeDollarRate } from "@/lib/bookingRate";

const MAX_NOTE_LENGTH = 250;

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

  useEffect(() => {
    if (!open) {
      setRateDigits("");
      setNote("");
      setError(null);
    }
  }, [open]);

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
      description="Send your fee for this booking. The planner can accept it or keep their original offer."
      loading={loading}
      onBackdropClick={onClose}
      footer={
        <>
          <BookingSheetSecondaryButton disabled={loading} onClick={onClose}>
            Cancel
          </BookingSheetSecondaryButton>
          <BookingSheetPrimaryButton disabled={loading} onClick={() => void handleSubmit()}>
            {loading ? "Sending..." : "Send rate proposal"}
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
          label="Note (optional)"
          value={note}
          onChange={setNote}
          placeholder="Travel, set length, equipment..."
          multiline
        />
        <p className="text-xs text-ftc-text-muted">
          {note.trim().length}/{MAX_NOTE_LENGTH}
        </p>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </BookingSheetDialog>
  );
}
