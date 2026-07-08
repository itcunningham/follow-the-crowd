"use client";

import { useEffect, useState } from "react";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import BookingFormField from "@/app/components/booking/BookingFormField";
import BookingSelectedDjsContext from "@/app/components/booking/BookingSelectedDjsContext";
import { BookingRateField } from "@/app/components/BookingRateField";
import BookingRateModeField from "@/app/components/booking/BookingRateModeField";
import type { BookingRequestInput } from "@/lib/bookingRequests";
import { getEventDateValidationError } from "@/lib/bookingDateTime";
import { isPositiveWholeDollarRate } from "@/lib/bookingRate";
import type { UserProfile } from "@/lib/user/currentUser";

const emptyForm: BookingRequestInput = {
  eventName: "",
  venue: "",
  eventDate: "",
  setTime: "",
  fee: "",
  notes: "",
  rateMode: "fixed",
};

export default function BookingRequestModal({
  open,
  selectedDjs,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  selectedDjs: UserProfile[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: BookingRequestInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BookingRequestInput>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);
  const dateValidationError = getEventDateValidationError(form.eventDate, form.setTime);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setLocalError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function updateField<Key extends keyof BookingRequestInput>(
    key: Key,
    value: BookingRequestInput[Key],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.eventName.trim() ||
      !form.venue.trim() ||
      !form.eventDate.trim() ||
      !form.setTime.trim()
    ) {
      return;
    }

    if (form.rateMode !== "open" && !form.fee.trim()) {
      return;
    }

    if (form.fee.trim() && !isPositiveWholeDollarRate(form.fee)) {
      return;
    }

    if (dateValidationError) {
      setLocalError(dateValidationError);
      return;
    }

    setLocalError(null);
    await onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-ftc-border-subtle bg-ftc-surface sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-request-title"
      >
        <div className="border-b border-ftc-border-subtle px-5 py-4">
          <h2 id="booking-request-title" className="text-lg font-semibold text-ftc-text">
            Send booking request
          </h2>
          <p className="mt-1 text-sm text-ftc-text-muted">
            Share event details with selected artists.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <BookingSelectedDjsContext selectedDjs={selectedDjs} />

          <BookingFormField
            label="Event name"
            value={form.eventName}
            onChange={(value) => updateField("eventName", value)}
            placeholder="Warehouse Sessions"
            required
          />
          <BookingFormField
            label="Venue"
            value={form.venue}
            onChange={(value) => updateField("venue", value)}
            placeholder="The Warehouse, Melbourne"
            required
          />
          <BookingDateField
            label="Date"
            value={form.eventDate}
            onChange={(value) => updateField("eventDate", value)}
            required
          />
          <BookingSetTimeRangeField
            value={form.setTime}
            onChange={(value) => updateField("setTime", value)}
            required
            eventDate={form.eventDate}
          />
          <BookingRateModeField
            value={form.rateMode ?? "fixed"}
            onChange={(value) => updateField("rateMode", value)}
          />
          <BookingRateField
            value={form.fee}
            onChange={(value) => updateField("fee", value)}
            label={form.rateMode === "open" ? "Suggested rate (optional)" : "Rate"}
            required={form.rateMode !== "open"}
          />
          <BookingFormField
            label="Notes"
            value={form.notes}
            onChange={(value) => updateField("notes", value)}
            placeholder="Genre, vibe, travel, equipment..."
            multiline
          />

          {(localError || dateValidationError || error) ? (
            <p className="text-sm text-red-400">
              {localError ?? dateValidationError ?? error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(dateValidationError)}
              className="flex-1 ftc-btn-primary w-full px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send booking request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
