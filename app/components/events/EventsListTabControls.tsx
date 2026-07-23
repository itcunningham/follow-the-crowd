"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { EventsListTabRow } from "@/app/components/events/EventsListTabRow";
import {
  EVENTS_CREATE_EVENT_BUTTON_CLASS,
  FTC_EVENTS_LIST_TAB_PILL_ROW_CLASS,
  eventsListTabPillClass,
} from "@/lib/design/ftcDesignSystem";
import {
  buildEventsListHref,
  resolveEventsListActiveTabLabelForWorkspaceChrome,
  resolveEventsListTabRowChrome,
  type EventsListTab,
} from "@/lib/events/eventsListNavigation";

export { EVENTS_CREATE_EVENT_BUTTON_CLASS };

export function EventsWorkspaceCreateEventPlaceholder() {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none invisible inline-flex ${EVENTS_CREATE_EVENT_BUTTON_CLASS}`}
    >
      Create event
    </span>
  );
}

export function EventsWorkspaceCreateEventLink() {
  return (
    <Link href="/events?create=event" className={EVENTS_CREATE_EVENT_BUTTON_CLASS}>
      Create event
    </Link>
  );
}

export function EventsWorkspaceCreateEventAction({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick?: () => void;
}) {
  if (disabled || !onClick) {
    return (
      <button
        type="button"
        disabled
        tabIndex={-1}
        aria-hidden="true"
        className={EVENTS_CREATE_EVENT_BUTTON_CLASS}
      >
        Create event
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={EVENTS_CREATE_EVENT_BUTTON_CLASS}>
      Create event
    </button>
  );
}

type EventsListTabControlsProps = {
  isPlanner: boolean;
  listTab: EventsListTab;
  createOpen?: boolean;
  onTabLinkClick?: (event: MouseEvent<HTMLAnchorElement>, tab: EventsListTab) => void;
  feedbackMessage?: string | null;
  feedbackFading?: boolean;
  selectionMode?: boolean;
  selectionToolbar?: ReactNode;
  onTrashClick?: () => void;
  historyLoadSettled?: boolean;
  visibleHistoryEventCount?: number;
  /** Loading shell: fixed trash row without waiting for list fetch. */
  loadingShell?: boolean;
};

export function EventsListTabControls({
  isPlanner,
  listTab,
  createOpen = false,
  onTabLinkClick,
  feedbackMessage = null,
  feedbackFading = false,
  selectionMode = false,
  selectionToolbar = null,
  onTrashClick,
  historyLoadSettled = false,
  visibleHistoryEventCount = 0,
  loadingShell = false,
}: EventsListTabControlsProps) {
  const guardProfile = useGuardProfile();
  const isHistoryTab = listTab === "history";
  const rowChrome = resolveEventsListTabRowChrome({
    isPlanner,
    isHistoryTab,
    createOpen,
    selectionMode,
    historyLoadSettled: loadingShell ? false : historyLoadSettled,
    visibleHistoryEventCount,
    loadingShell,
  });

  const activeTabClass = eventsListTabPillClass(!createOpen && !isHistoryTab);
  const historyTabClass = eventsListTabPillClass(!createOpen && isHistoryTab);
  const activeLabel = resolveEventsListActiveTabLabelForWorkspaceChrome(isPlanner, {
    loadingShell,
    guardRole: guardProfile?.role,
  });

  return (
    <EventsListTabRow
      showTrashButton={rowChrome.showTrashButton}
      trashButtonDisabled={rowChrome.trashButtonDisabled}
      onTrashClick={onTrashClick}
      reserveTrashSlot={rowChrome.reserveTrashSlot}
      feedbackMessage={feedbackMessage}
      feedbackFading={feedbackFading}
      selectionMode={selectionMode}
      selectionToolbar={selectionToolbar}
    >
      <div className={FTC_EVENTS_LIST_TAB_PILL_ROW_CLASS}>
        <Link
          href={buildEventsListHref("active")}
          className={activeTabClass}
          onClick={
            onTabLinkClick
              ? (event) => {
                  onTabLinkClick(event, "active");
                }
              : undefined
          }
        >
          {activeLabel}
        </Link>
        <Link
          href={buildEventsListHref("history")}
          className={historyTabClass}
          onClick={
            onTabLinkClick
              ? (event) => {
                  onTabLinkClick(event, "history");
                }
              : undefined
          }
        >
          History
        </Link>
      </div>
    </EventsListTabRow>
  );
}
