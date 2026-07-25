import { useEffect, useState } from "react";

/** Fully visible duration before fade begins (Events + Gigs History header feedback). */
export const HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS = 2700;

/** Opacity transition duration — must match `duration-300` on feedback text classes. */
export const HISTORY_REMOVAL_FEEDBACK_FADE_MS = 300;

/** Clear display message only after visible window + fade transition complete. */
export const HISTORY_REMOVAL_FEEDBACK_CLEAR_MS =
  HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS + HISTORY_REMOVAL_FEEDBACK_FADE_MS;

/** @deprecated Use HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS */
export const INLINE_TAB_FEEDBACK_FADE_MS = HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS;

/** @deprecated Use HISTORY_REMOVAL_FEEDBACK_CLEAR_MS */
export const INLINE_TAB_FEEDBACK_CLEAR_MS = HISTORY_REMOVAL_FEEDBACK_CLEAR_MS;

/** Shared muted inline feedback typography. */
export const INLINE_TAB_FEEDBACK_TEXT_CLASS =
  "text-[11px] font-normal leading-none text-ftc-text-muted transition-opacity duration-300 ease-out sm:text-xs";

/** History removal success — centred in planner title row; no truncation. */
export const PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS = `${INLINE_TAB_FEEDBACK_TEXT_CLASS} whitespace-nowrap text-center`;

export function formatEventsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} event${count === 1 ? "" : "s"} removed from history`;
}

export function formatGigsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} gig${count === 1 ? "" : "s"} removed from history`;
}

export function useHistoryRemovalHeaderFeedback(
  message: string | null,
  onClearSource: () => void,
): { displayMessage: string | null; fading: boolean } {
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!message) {
      setDisplayMessage(null);
      setFading(false);
      return;
    }

    setDisplayMessage(message);
    setFading(false);

    const fadeTimer = window.setTimeout(
      () => setFading(true),
      HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS,
    );
    const clearTimer = window.setTimeout(() => {
      setDisplayMessage(null);
      setFading(false);
      onClearSource();
    }, HISTORY_REMOVAL_FEEDBACK_CLEAR_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message, onClearSource]);

  return { displayMessage, fading };
}

/** Tab-row inline feedback (Event Plans toolbar). Shares lifecycle constants via header hook. */
export function useInlineTabFeedbackDismiss(
  message: string | null,
  onClear: () => void,
): boolean {
  const { fading } = useHistoryRemovalHeaderFeedback(message, onClear);
  return fading;
}
