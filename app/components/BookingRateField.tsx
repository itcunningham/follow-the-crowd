"use client";

import { BOOKING_FIELD_LABEL_CLASS } from "@/lib/bookingDateTime";
import { MAX_RATE_DIGITS, sanitizeRateDigits } from "@/lib/bookingRate";

export const BOOKING_RATE_INPUT_CLASS =
  "flex w-full items-center rounded-xl border border-ftc-border-subtle bg-ftc-bg-input text-sm text-ftc-text outline-none transition focus-within:border-ftc-primary-border";

export function BookingRateField({
  label = "Rate",
  value,
  onChange,
  required = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const digits = sanitizeRateDigits(value);

  function handleChange(rawValue: string) {
    onChange(sanitizeRateDigits(rawValue));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key.length === 1 && /\d/.test(event.key) && digits.length >= MAX_RATE_DIGITS) {
      event.preventDefault();
      return;
    }

    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    handleChange(event.clipboardData.getData("text"));
  }

  return (
    <label className="block">
      <span className={BOOKING_FIELD_LABEL_CLASS}>{label}</span>
      <div className={BOOKING_RATE_INPUT_CLASS}>
        <span className="shrink-0 pl-3.5 tabular-nums text-ftc-text">$</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={digits}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          required={required && !digits}
          aria-label={label}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 tabular-nums text-ftc-text outline-none"
        />
      </div>
    </label>
  );
}
