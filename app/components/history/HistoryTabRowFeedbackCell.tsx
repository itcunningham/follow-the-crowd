import { EVENTS_LIST_TAB_FEEDBACK_CLASS } from "@/lib/design/ftcDesignSystem";
import { GIGS_LIST_TAB_FEEDBACK_CLASS } from "@/lib/design/inlineTabFeedback";

type HistoryTabRowFeedbackCellProps = {
  message: string | null;
  fading: boolean;
  selectionMode?: boolean;
  /** Gigs uses an absolute overlay so full copy fits beside three tab pills. */
  variant?: "events" | "gigs";
};

export function HistoryTabRowFeedbackCell({
  message,
  fading,
  selectionMode = false,
  variant = "events",
}: HistoryTabRowFeedbackCellProps) {
  const feedbackClassName =
    variant === "gigs" ? GIGS_LIST_TAB_FEEDBACK_CLASS : EVENTS_LIST_TAB_FEEDBACK_CLASS;
  const opacityClassName = fading ? "opacity-0" : "opacity-100";

  return (
    <div
      className={`relative min-h-0 min-w-0 flex-1 ${
        variant === "gigs" ? "overflow-visible" : "overflow-hidden"
      }`}
      aria-live={selectionMode ? undefined : "polite"}
    >
      {!selectionMode && message ? (
        variant === "gigs" ? (
          <p
            className={`absolute left-0 top-1/2 -translate-y-1/2 ${feedbackClassName} ${opacityClassName}`}
          >
            {message}
          </p>
        ) : (
          <p className={`${feedbackClassName} ${opacityClassName}`}>{message}</p>
        )
      ) : null}
    </div>
  );
}
