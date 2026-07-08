"use client";

import {
  EVENT_AUTOMATIC_FALLBACK_COLOUR,
  EVENT_SELECTABLE_FALLBACK_COLOUR_OPTIONS,
  getEventFallbackColour,
  getEventFallbackColourLabel,
  NEUTRAL_FALLBACK_COLOUR_LABEL,
  getEventFallbackColourStyles,
  type EventSelectableFallbackColourKey,
} from "@/lib/events/eventFallbackColour";
import { BOOKING_FIELD_LABEL_CLASS } from "@/lib/bookingDateTime";

function SwatchButton({
  label,
  selected,
  disabled,
  swatchClassName,
  onClick,
  showInitial = false,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  swatchClassName: string;
  onClick: () => void;
  showInitial?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-lg transition hover:bg-ftc-bg-elevated/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`flex h-10 w-full items-center justify-center rounded-xl border text-[10px] font-semibold uppercase tracking-wide transition ${
          selected
            ? "border-ftc-text-secondary bg-ftc-bg-elevated/30"
            : "border-ftc-border-subtle hover:border-ftc-border-strong hover:bg-ftc-bg-elevated/50"
        } ${swatchClassName} ${showInitial ? "text-[#e2e8f0]" : "text-white"}`}
      >
        {showInitial ? "N" : null}
      </span>
      <span
        className={`text-[10px] font-medium ${
          selected ? "text-ftc-text" : "text-ftc-text-muted"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function EventFallbackColourField({
  eventName,
  value,
  onChange,
  disabled = false,
  flyerActive = false,
}: {
  eventName: string;
  value: EventSelectableFallbackColourKey | null;
  onChange: (next: EventSelectableFallbackColourKey | null) => void;
  disabled?: boolean;
  flyerActive?: boolean;
}) {
  const previewColour = getEventFallbackColour(eventName, value);
  const autoStyles = getEventFallbackColourStyles(EVENT_AUTOMATIC_FALLBACK_COLOUR);
  const colourSelectionDisabled = disabled || flyerActive;

  return (
    <div>
      <span className={BOOKING_FIELD_LABEL_CLASS}>Event colour</span>
      <p className="mb-3 text-xs text-ftc-text-muted">
        {flyerActive
          ? "A flyer is active. Remove it to use an event colour."
          : "Used when no flyer is uploaded."}
      </p>

      <div
        className={`grid grid-cols-4 gap-2 sm:grid-cols-4 ${
          colourSelectionDisabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <SwatchButton
          label={NEUTRAL_FALLBACK_COLOUR_LABEL}
          selected={value === null}
          disabled={colourSelectionDisabled}
          swatchClassName={autoStyles.swatchClassName}
          showInitial
          onClick={() => onChange(null)}
        />

        {EVENT_SELECTABLE_FALLBACK_COLOUR_OPTIONS.map((option) => {
          const styles = getEventFallbackColourStyles(option.key);

          return (
            <SwatchButton
              key={option.key}
              label={option.label}
              selected={value === option.key}
              disabled={colourSelectionDisabled}
              swatchClassName={styles.swatchClassName}
              onClick={() => onChange(value === option.key ? null : option.key)}
            />
          );
        })}
      </div>

      <p className="mt-3 text-xs text-ftc-text-muted">
        Preview tile colour:{" "}
        <span className="font-semibold text-ftc-text">
          {getEventFallbackColourLabel(previewColour)}
        </span>
      </p>
    </div>
  );
}
