import { useEffect, useState } from "react";

/** Matches Events History tab-row feedback dismiss (EventsPageClient). */
export const INLINE_TAB_FEEDBACK_FADE_MS = 2700;
export const INLINE_TAB_FEEDBACK_CLEAR_MS = 3000;

/** Shared muted inline feedback typography (Events History tab row). */
export const INLINE_TAB_FEEDBACK_TEXT_CLASS =
  "text-[11px] font-normal leading-none text-ftc-text-muted transition-opacity duration-300 sm:text-xs";

/** Gigs History tab-row feedback — Events typography; overlay layer avoids truncate at 390px. */
export const GIGS_LIST_TAB_FEEDBACK_CLASS = `${INLINE_TAB_FEEDBACK_TEXT_CLASS} whitespace-nowrap`;

export function formatGigsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} gig${count === 1 ? "" : "s"} removed from history`;
}

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
