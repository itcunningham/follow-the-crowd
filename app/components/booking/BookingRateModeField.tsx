"use client";

import { BOOKING_FIELD_LABEL_CLASS } from "@/lib/bookingDateTime";
import type { BookingRateMode } from "@/lib/bookingRequests";

const OPTIONS: Array<{ value: BookingRateMode; title: string; description: string }> = [
  {
    value: "fixed",
    title: "Fixed offer",
    description: "DJ can accept or decline your rate.",
  },
  {
    value: "open",
    title: "Ask for rate",
    description: "DJ sends their price before accepting.",
  },
];

export default function BookingRateModeField({
  value,
  onChange,
}: {
  value: BookingRateMode;
  onChange: (value: BookingRateMode) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={BOOKING_FIELD_LABEL_CLASS}>Rate type</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-ftc-primary bg-ftc-bg-elevated"
                  : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
              }`}
            >
              <p className="text-sm font-semibold text-ftc-text">{option.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ftc-text-muted">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
