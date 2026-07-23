import type { ReactNode } from "react";
import { HistoryManageButton } from "@/app/components/history/HistoryBulkManage";
import {
  EVENTS_LIST_TAB_FEEDBACK_CLASS,
  EVENTS_LIST_TAB_ROW_CLASS,
  FTC_EVENTS_LIST_TAB_ACTION_CLASS,
  FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS,
} from "@/lib/design/ftcDesignSystem";

export function EventsListTabRow({
  children,
  showTrashButton = false,
  trashButtonDisabled = true,
  onTrashClick,
  reserveTrashSlot = false,
  feedbackMessage = null,
  feedbackFading = false,
  selectionMode = false,
  selectionToolbar = null,
  trashAriaLabel = "Manage history",
}: {
  children: ReactNode;
  showTrashButton?: boolean;
  trashButtonDisabled?: boolean;
  onTrashClick?: () => void;
  /** Keep tab row height identical when trash is hidden (Events Active tab). */
  reserveTrashSlot?: boolean;
  feedbackMessage?: string | null;
  feedbackFading?: boolean;
  selectionMode?: boolean;
  selectionToolbar?: ReactNode;
  trashAriaLabel?: string;
}) {
  const showRightTrash = !selectionMode && showTrashButton;
  const showRightPlaceholder = !selectionMode && !showTrashButton && reserveTrashSlot;

  return (
    <div className={EVENTS_LIST_TAB_ROW_CLASS}>
      <div className="flex shrink-0 items-center">{children}</div>
      <div className="flex h-full min-h-0 min-w-0 flex-1 items-center overflow-hidden">
        {selectionMode ? (
          <div className="flex h-full min-w-0 flex-1 items-center justify-end overflow-hidden">
            {selectionToolbar}
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1 overflow-hidden" aria-live="polite">
              {feedbackMessage ? (
                <p
                  className={`${EVENTS_LIST_TAB_FEEDBACK_CLASS} ${
                    feedbackFading ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {feedbackMessage}
                </p>
              ) : null}
            </div>
            <div className="flex w-[1.875rem] shrink-0 items-center justify-end">
              {showRightTrash ? (
                <HistoryManageButton
                  ariaLabel={trashAriaLabel}
                  onClick={onTrashClick ?? (() => undefined)}
                  disabled={trashButtonDisabled || !onTrashClick}
                  className={FTC_EVENTS_LIST_TAB_ACTION_CLASS}
                />
              ) : showRightPlaceholder ? (
                <span aria-hidden="true" className={FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS} />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
