"use client";

import type { MouseEvent, ReactNode } from "react";
import { PlannerWorkspacePage } from "@/app/components/planner/PlannerWorkspaceLayout";
import { EVENTS_AREA_SUB_NAV, mergeWorkspaceNavRole } from "@/lib/plannerEventsNav";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";
import type { EventsListTab } from "@/lib/events/eventsListNavigation";
import {
  EventsListTabControls,
  EventsWorkspaceCreateEventAction,
} from "@/app/components/events/EventsListTabControls";

export function resolveEventsWorkspaceDisplayRole(
  ...candidates: Array<UserRole | null | undefined>
): UserRole | null {
  return mergeWorkspaceNavRole(...candidates, readCachedNavRole());
}

type EventsWorkspacePageProps = {
  role?: UserRole | null;
  activeWorkspaceHref?: string | null;
  headerActions?: ReactNode;
  listTab: EventsListTab;
  createOpen?: boolean;
  /** Match route loading shell until the events list has settled. */
  loadingShell?: boolean;
  onTabLinkClick?: (event: MouseEvent<HTMLAnchorElement>, tab: EventsListTab) => void;
  feedbackMessage?: string | null;
  feedbackFading?: boolean;
  selectionMode?: boolean;
  selectionToolbar?: ReactNode;
  onTrashClick?: () => void;
  historyLoadSettled?: boolean;
  visibleHistoryEventCount?: number;
  omitSecondaryControls?: boolean;
  secondaryControlsPlaceholder?: boolean;
  children: ReactNode;
};

/** Shared Events workspace chrome for route loading and loaded page (list body is swappable). */
export function EventsWorkspacePage({
  role: roleProp,
  activeWorkspaceHref = EVENTS_AREA_SUB_NAV.events.href,
  headerActions,
  listTab,
  createOpen = false,
  loadingShell = false,
  onTabLinkClick,
  feedbackMessage = null,
  feedbackFading = false,
  selectionMode = false,
  selectionToolbar = null,
  onTrashClick,
  historyLoadSettled = false,
  visibleHistoryEventCount = 0,
  omitSecondaryControls = false,
  secondaryControlsPlaceholder = false,
  children,
}: EventsWorkspacePageProps) {
  const displayRole = resolveEventsWorkspaceDisplayRole(roleProp);
  const isPlanner = canManageEvents(displayRole);
  const resolvedHeaderActions =
    headerActions !== undefined
      ? headerActions
      : isPlanner
        ? <EventsWorkspaceCreateEventAction disabled />
        : undefined;

  return (
    <PlannerWorkspacePage
      initialRole={displayRole}
      activeWorkspaceHref={activeWorkspaceHref}
      includeChrome={false}
      actions={resolvedHeaderActions}
      secondaryControlsSlot={
        omitSecondaryControls ? undefined : (
          <EventsListTabControls
            isPlanner={isPlanner}
            listTab={listTab}
            createOpen={createOpen}
            loadingShell={loadingShell}
            onTabLinkClick={onTabLinkClick}
            feedbackMessage={feedbackMessage}
            feedbackFading={feedbackFading}
            selectionMode={selectionMode}
            selectionToolbar={selectionToolbar}
            onTrashClick={onTrashClick}
            historyLoadSettled={historyLoadSettled}
            visibleHistoryEventCount={visibleHistoryEventCount}
          />
        )
      }
      secondaryControlsPlaceholder={secondaryControlsPlaceholder}
    >
      {children}
    </PlannerWorkspacePage>
  );
}
