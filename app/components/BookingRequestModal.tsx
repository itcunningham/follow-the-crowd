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
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-[#070708] shadow-[0_0_40px_rgba(59,130,246,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-request-title"
      >
        <div className="border-b border-zinc-800/80 px-5 py-4">
          <h2 id="booking-request-title" className="text-lg font-semibold text-zinc-50">
            Send booking request
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sending to {selectedDjs.length} DJ{selectedDjs.length === 1 ? "" : "s"}: {djNames}
          </p>
          <p className="mt-2 text-xs text-zinc-600">
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
              className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
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
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      )}
    </label>
  );
}
