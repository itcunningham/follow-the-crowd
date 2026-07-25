import { useCallback, useEffect, useState } from "react";

/** Fully visible duration before fade begins (Events + Gigs History header feedback). */
export const HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS = 2700;

/** Opacity transition duration — must match `duration-[350ms]` on feedback text classes. */
export const HISTORY_REMOVAL_FEEDBACK_FADE_MS = 350;

/** Small buffer after fade starts so clear runs only after the CSS transition finishes. */
export const HISTORY_REMOVAL_FEEDBACK_FADE_BUFFER_MS = 16;

/** @deprecated Derived total; prefer VISIBLE_MS + fade chain in the hook. */
export const HISTORY_REMOVAL_FEEDBACK_CLEAR_MS =
  HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS +
  HISTORY_REMOVAL_FEEDBACK_FADE_MS +
  HISTORY_REMOVAL_FEEDBACK_FADE_BUFFER_MS;

/** @deprecated Use HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS */
export const INLINE_TAB_FEEDBACK_FADE_MS = HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS;

/** @deprecated Use HISTORY_REMOVAL_FEEDBACK_CLEAR_MS */
export const INLINE_TAB_FEEDBACK_CLEAR_MS = HISTORY_REMOVAL_FEEDBACK_CLEAR_MS;

/** Shared muted inline feedback typography. */
export const INLINE_TAB_FEEDBACK_TEXT_CLASS =
  "text-[11px] font-normal leading-none text-ftc-text-muted transition-opacity duration-[350ms] ease-out sm:text-xs";

/** History removal success — centred below planner title row; fade via globals.css animation. */
export const PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS = "ftc-history-removal-feedback";

export const PLANNER_WORKSPACE_TITLE_FEEDBACK_FADING_CLASS =
  "ftc-history-removal-feedback--fading";

export function formatEventsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} event${count === 1 ? "" : "s"} removed from history`;
}

export function formatGigsHistoryRemoveSuccessMessage(count: number): string {
  return `${count} gig${count === 1 ? "" : "s"} removed from history`;
}

export function useHistoryRemovalHeaderFeedback(
  message: string | null,
  onClearSource: () => void,
): {
  displayMessage: string | null;
  fading: boolean;
  completeFade: () => void;
} {
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  const completeFade = useCallback(() => {
    setDisplayMessage(null);
    setFading(false);
    onClearSource();
  }, [onClearSource]);

  useEffect(() => {
    if (!message) {
      setDisplayMessage(null);
      setFading(false);
      return;
    }

    setDisplayMessage(message);
    setFading(false);

    const fadeTimer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setFading(true);
        });
      });
    }, HISTORY_REMOVAL_FEEDBACK_VISIBLE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
    };
  }, [message]);

  return { displayMessage, fading, completeFade };
}

/** Tab-row inline feedback (Event Plans toolbar). Shares lifecycle constants via header hook. */
export function useInlineTabFeedbackDismiss(
  message: string | null,
  onClear: () => void,
): boolean {
  const { fading } = useHistoryRemovalHeaderFeedback(message, onClear);
  return fading;
}
