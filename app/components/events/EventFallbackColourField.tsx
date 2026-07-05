"use client";

import {
  EVENT_FALLBACK_COLOUR_OPTIONS,
  getEventFallbackColour,
  getEventFallbackColourStyles,
  type EventFallbackColourKey,
} from "@/lib/events/eventFallbackColour";
import { BOOKING_FIELD_LABEL_CLASS } from "@/lib/bookingDateTime";

export default function EventFallbackColourField({
  eventName,
  value,
  onChange,
  disabled = false,
}: {
  eventName: string;
  value: EventFallbackColourKey | null;
  onChange: (next: EventFallbackColourKey | null) => void;
  disabled?: boolean;
}) {
  const previewColour = getEventFallbackColour(eventName, value);

  return (
    <div>
      <span className={BOOKING_FIELD_LABEL_CLASS}>Event colour</span>
      <p className="mb-3 text-xs text-ftc-text-muted">Used when no flyer is uploaded.</p>

      <div className="flex flex-wrap gap-2">
        {EVENT_FALLBACK_COLOUR_OPTIONS.map((option) => {
          const selected = value === option.key;
          const styles = getEventFallbackColourStyles(option.key);

          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(selected ? null : option.key)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-ftc-text-secondary ring-1 ring-ftc-border-strong"
                  : "border-ftc-border-subtle hover:border-ftc-border-strong"
              } ${styles.tileClassName}`}
            >
              <span className={`h-4 w-4 rounded-md border border-current/40 ${styles.textClassName}`} />
              {selected ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-ftc-border-subtle bg-ftc-bg text-[10px] font-bold text-ftc-text">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-ftc-text-muted">
        Preview tile colour:{" "}
        <span className={`font-semibold ${getEventFallbackColourStyles(previewColour).textClassName}`}>
          {EVENT_FALLBACK_COLOUR_OPTIONS.find((option) => option.key === previewColour)?.label ??
            previewColour}
        </span>
        {value ? null : " (auto from event name)"}
      </p>
    </div>
  );
}
