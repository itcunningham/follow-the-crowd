import { EVENTS_LIST_TAB_FEEDBACK_CLASS } from "@/lib/design/ftcDesignSystem";

type HistoryTabRowFeedbackCellProps = {
  message: string | null;
  fading: boolean;
  selectionMode?: boolean;
};

export function HistoryTabRowFeedbackCell({
  message,
  fading,
  selectionMode = false,
}: HistoryTabRowFeedbackCellProps) {
  const opacityClassName = fading ? "opacity-0" : "opacity-100";

  return (
    <div
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
      aria-live={selectionMode ? undefined : "polite"}
    >
      {!selectionMode && message ? (
        <p className={`${EVENTS_LIST_TAB_FEEDBACK_CLASS} ${opacityClassName}`}>{message}</p>
      ) : null}
    </div>
  );
}
