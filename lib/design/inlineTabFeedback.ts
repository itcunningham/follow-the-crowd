import { useEffect, useState } from "react";

/** Fully visible duration before fade begins — matches Event Plans `useInlineTabFeedbackDismiss`. */
export const INLINE_TAB_FEEDBACK_FADE_MS = 2700;

/** Clear message after visible window + `duration-300` opacity transition (2700 + 300). */
export const INLINE_TAB_FEEDBACK_CLEAR_MS = 3000;

/** Aliases used by history header feedback tests and docs. */
export const HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS = INLINE_TAB_FEEDBACK_FADE_MS;
export const HISTORY_REMOVAL_FEEDBACK_FADE_MS = 300;
export const HISTORY_REMOVAL_FEEDBACK_CLEAR_MS = INLINE_TAB_FEEDBACK_CLEAR_MS;

/** Shared muted inline feedback typography (Event Plans toolbar + history header slot). */
export const INLINE_TAB_FEEDBACK_TEXT_CLASS =
  "text-[11px] font-normal leading-none text-ftc-text-muted transition-opacity duration-300 sm:text-xs";

export function formatEventsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} event${count === 1 ? "" : "s"} removed from history`;
}

export function formatGigsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} gig${count === 1 ? "" : "s"} removed from history`;
}

export function formatGigsCalendarAvailabilityMarkedMessage(
  count: number,
  statusLabel: "available" | "maybe" | "unavailable",
): string {
  return count === 1
    ? `1 date marked ${statusLabel}`
    : `${count} dates marked ${statusLabel}`;
}

export function formatGigsCalendarAvailabilityClearedMessage(count: number): string {
  return count === 1
    ? "Availability cleared for 1 date"
    : `Availability cleared for ${count} dates`;
}

/** Event detail header feedback after a pending booking request is cancelled successfully. */
export const BOOKING_REQUEST_CANCELLED_SUCCESS_MESSAGE = "Booking request cancelled";

/** Transient inline success feedback lifecycle — source of truth for Event Plans + History header. */
export function useInlineTabFeedbackDismiss(
  message: string | null,
  onClear: () => void,
): boolean {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!message) {
      setFading(false);
      return;
    }

    setFading(false);
    const fadeTimer = window.setTimeout(() => setFading(true), INLINE_TAB_FEEDBACK_FADE_MS);
    const clearTimer = window.setTimeout(() => {
      onClear();
      setFading(false);
    }, INLINE_TAB_FEEDBACK_CLEAR_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message, onClear]);

  return fading;
}
