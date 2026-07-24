import type { ReactNode } from "react";
import { HistoryManageButton } from "@/app/components/history/HistoryBulkManage";
import { HistoryTabRowFeedbackCell } from "@/app/components/history/HistoryTabRowFeedbackCell";
import {
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
      <HistoryTabRowFeedbackCell
        message={feedbackMessage}
        fading={feedbackFading}
        selectionMode={selectionMode}
        variant="events"
      />
      <div className="flex shrink-0 items-center justify-end">
        {selectionMode ? (
          selectionToolbar
        ) : showRightTrash ? (
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
    </div>
  );
}
