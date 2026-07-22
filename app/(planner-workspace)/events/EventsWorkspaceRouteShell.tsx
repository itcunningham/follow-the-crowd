"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  EventsListTabControls,
  EventsWorkspaceCreateEventAction,
} from "@/app/components/events/EventsListTabControls";
import {
  EventsWorkspacePageBridgeContext,
  type EventsWorkspacePageBridgeState,
} from "@/app/components/events/EventsWorkspacePageBridge";
import {
  PlannerWorkspacePageContent,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import {
  isCalendarOriginCreateParam,
  resolveEventsListTabParam,
} from "@/lib/events/eventsListNavigation";
import { EVENTS_AREA_SUB_NAV, mergeWorkspaceNavRole } from "@/lib/plannerEventsNav";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { canManageEvents } from "@/lib/user/currentUser";

function resolveRouteListTab(searchParams: URLSearchParams | null): "active" | "history" {
  if (!searchParams) {
    return "active";
  }

  return resolveEventsListTabParam(searchParams.get("tab"), null, null) === "history"
    ? "history"
    : "active";
}

export default function EventsWorkspaceRouteShell({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const guardProfile = useGuardProfile();
  const [pageBridge, setPageBridge] = useState<EventsWorkspacePageBridgeState | null>(null);

  const displayRole = mergeWorkspaceNavRole(guardProfile?.role, readCachedNavRole());
  const isPlanner = canManageEvents(displayRole);
  const createParam = searchParams.get("create");
  const isCalendarCreateFlow =
    pageBridge?.isCalendarCreateFlow ?? isCalendarOriginCreateParam(createParam);
  const listTab =
    pageBridge?.isHistoryTab != null
      ? pageBridge.isHistoryTab
        ? "history"
        : "active"
      : resolveRouteListTab(searchParams);

  const workspaceHeaderActions = useMemo(() => {
    if (pageBridge?.workspaceHeaderActions !== undefined) {
      return pageBridge.workspaceHeaderActions;
    }

    return isPlanner ? <EventsWorkspaceCreateEventAction disabled /> : undefined;
  }, [isPlanner, pageBridge?.workspaceHeaderActions]);

  const bridgeContextValue = useMemo(
    () => ({
      pageBridge,
      setPageBridge,
    }),
    [pageBridge],
  );

  const secondaryControlsSlot = isCalendarCreateFlow ? undefined : (
    <EventsListTabControls
      isPlanner={isPlanner}
      listTab={listTab}
      createOpen={pageBridge?.createOpen ?? false}
      loadingShell={pageBridge ? !pageBridge.eventsListReady : true}
      onTabLinkClick={pageBridge?.handleEventsListTabLinkClick}
      feedbackMessage={pageBridge?.isHistoryTab ? pageBridge.successMessage ?? null : null}
      feedbackFading={pageBridge?.historyFeedbackFading ?? false}
      selectionMode={pageBridge?.historyTabRowSelectionMode ?? false}
      onTrashClick={pageBridge?.onTrashClick}
      historyLoadSettled={pageBridge?.historyLoadSettled ?? false}
      visibleHistoryEventCount={pageBridge?.visibleHistoryEventCount ?? 0}
      selectionToolbar={pageBridge?.selectionToolbar ?? null}
    />
  );

  return (
    <EventsWorkspacePageBridgeContext.Provider value={bridgeContextValue}>
      <PlannerWorkspacePageContent
        initialRole={displayRole}
        activeWorkspaceHref={
          pageBridge?.activeWorkspaceHref ?? EVENTS_AREA_SUB_NAV.events.href
        }
        actions={workspaceHeaderActions}
        secondaryControlsSlot={secondaryControlsSlot}
        secondaryControlsPlaceholder={isCalendarCreateFlow}
      >
        {children}
      </PlannerWorkspacePageContent>
    </EventsWorkspacePageBridgeContext.Provider>
  );
}
