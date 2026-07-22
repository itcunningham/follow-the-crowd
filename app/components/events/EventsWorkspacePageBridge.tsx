"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { EventsListTab } from "@/lib/events/eventsListNavigation";

export type EventsWorkspacePageBridgeState = {
  activeWorkspaceHref?: string | null;
  workspaceHeaderActions?: ReactNode;
  createOpen?: boolean;
  isCalendarCreateFlow?: boolean;
  eventsListReady?: boolean;
  isHistoryTab?: boolean;
  historyFeedbackFading?: boolean;
  historyTabRowSelectionMode?: boolean;
  historyLoadSettled?: boolean;
  visibleHistoryEventCount?: number;
  successMessage?: string | null;
  handleEventsListTabLinkClick?: (
    event: MouseEvent<HTMLAnchorElement>,
    tab: EventsListTab,
  ) => void;
  onTrashClick?: () => void;
  selectionToolbar?: ReactNode;
};

type EventsWorkspacePageBridgeContextValue = {
  pageBridge: EventsWorkspacePageBridgeState | null;
  setPageBridge: Dispatch<SetStateAction<EventsWorkspacePageBridgeState | null>>;
};

export const EventsWorkspacePageBridgeContext =
  createContext<EventsWorkspacePageBridgeContextValue | null>(null);

export function useEventsWorkspacePageBridgeContext() {
  return useContext(EventsWorkspacePageBridgeContext);
}
