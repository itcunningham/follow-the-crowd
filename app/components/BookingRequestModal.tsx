"use client";

import { useEffect, useState } from "react";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import type { BookingRequestInput } from "@/lib/bookingRequests";
import type { UserProfile } from "@/lib/user/currentUser";

const emptyForm: BookingRequestInput = {
  eventName: "",
  venue: "",
  eventDate: "",
  setTime: "",
  fee: "",
  notes: "",
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

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
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
      !form.setTime.trim() ||
      !form.fee.trim()
    ) {
      return;
    }

    await onSubmit(form);
  }

  const djNames = selectedDjs
    .map((dj) => dj.display_name?.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ftc-border bg-ftc-bg shadow-ftc-glow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-request-title"
      >
        <div className="border-b border-ftc-border px-5 py-4">
          <h2 id="booking-request-title" className="text-lg font-semibold text-ftc-text">
            Send booking request
          </h2>
          <p className="mt-1 text-sm text-ftc-text-muted">
            Sending to {selectedDjs.length} DJ{selectedDjs.length === 1 ? "" : "s"}: {djNames}
          </p>
          <p className="mt-2 text-xs text-ftc-text-muted">
            Each DJ will receive a separate private message.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <BookingField
            label="Event name"
            value={form.eventName}
            onChange={(value) => updateField("eventName", value)}
            placeholder="Warehouse Sessions"
            required
          />
          <BookingField
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
          />
          <BookingRateField
            value={form.fee}
            onChange={(value) => updateField("fee", value)}
            required
          />
          <BookingField
            label="Notes"
            value={form.notes}
            onChange={(value) => updateField("notes", value)}
            placeholder="Genre, vibe, travel, equipment..."
            multiline
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl border border-ftc-primary/40 bg-ftc-primary/10 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-ftc-primary/80 shadow-ftc-glow transition hover:border-ftc-primary/50 hover:bg-ftc-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send booking request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-ftc-border bg-ftc-surface/80 px-3.5 py-2.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-ftc-primary/45 focus:ring-2 focus:ring-ftc-primary/15"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-ftc-border bg-ftc-surface/80 px-3.5 py-2.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-ftc-primary/45 focus:ring-2 focus:ring-ftc-primary/15"
        />
      )}
    </label>
  );
}
