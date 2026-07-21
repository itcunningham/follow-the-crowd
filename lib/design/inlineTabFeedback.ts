import { useEffect, useState } from "react";

/** Matches Events History tab-row feedback dismiss (EventsPageClient). */
export const INLINE_TAB_FEEDBACK_FADE_MS = 2700;
export const INLINE_TAB_FEEDBACK_CLEAR_MS = 3000;

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
