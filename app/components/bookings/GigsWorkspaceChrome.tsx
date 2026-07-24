"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DjGigsTabs } from "@/app/components/bookings/DjGigsTabs";
import { HistorySelectionToolbar } from "@/app/components/history/HistoryBulkManage";
import { DjGigsTabRow } from "@/app/components/skeleton/Skeleton";
import {
  PlannerWorkspaceSecondaryControls,
  PlannerWorkspaceSecondaryControlsPlaceholder,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { PLANNER_WORKSPACE_SECONDARY_BAND_CLASS } from "@/lib/design/plannerWorkspaceTokens";
import { resolveGigsListTabForBookingsPage } from "@/lib/bookings/gigsListNavigation";
import {
  clearGigsListTabPending,
  readGigsListTabPending,
  resolveDisplayedGigsListTab,
  subscribeGigsListTabPending,
  syncGigsListTabPendingWithRoute,
  bumpGigsListRouteRevision,
  readGigsListRouteRevision,
  subscribeGigsListRouteRevision,
} from "@/lib/bookings/gigsListTabPending";
import { readGigsTabCountsCache } from "@/lib/bookings/gigsTabCountsCache";
import { isPlannerBookingsCreateChromeActive } from "@/lib/bookings/planDeepLink";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import type { DjGigsListTab } from "@/lib/bookingRequests";
import type { UserRole } from "@/lib/user/currentUser";

export type GigsWorkspaceChromeState = {
  counts: Record<DjGigsListTab, number> | null;
  showManageButton: boolean;
  reserveManageSlot: boolean;
  onManageClick?: () => void;
  historySelectionMode: boolean;
  historySelectionSelectedCount: number;
  historySelectionAllSelected: boolean;
  historySelectionRemoving: boolean;
  historySelectionCanToggleAll: boolean;
  historySelectionCanDelete: boolean;
  onHistorySelectionCancel?: () => void;
  onHistorySelectionSelectAll?: () => void;
  onHistorySelectionRemove?: () => void;
  historyFeedbackMessage: string | null;
  historyFeedbackFading: boolean;
};

export const defaultGigsWorkspaceChromeState: GigsWorkspaceChromeState = {
  counts: null,
  showManageButton: false,
  reserveManageSlot: true,
  onManageClick: undefined,
  historySelectionMode: false,
  historySelectionSelectedCount: 0,
  historySelectionAllSelected: false,
  historySelectionRemoving: false,
  historySelectionCanToggleAll: false,
  historySelectionCanDelete: false,
  onHistorySelectionCancel: undefined,
  onHistorySelectionSelectAll: undefined,
  onHistorySelectionRemove: undefined,
  historyFeedbackMessage: null,
  historyFeedbackFading: false,
};

const GigsWorkspaceChromeDispatchContext =
  createContext<Dispatch<SetStateAction<GigsWorkspaceChromeState>> | null>(null);

const GigsWorkspaceChromeStateContext =
  createContext<GigsWorkspaceChromeState>(defaultGigsWorkspaceChromeState);

export function canShowGigsWorkspaceTabs(role: UserRole | null): boolean {
  return role === "dj" || role === "both" || role === null;
}

export function gigsWorkspaceChromeStatesEqual(
  left: GigsWorkspaceChromeState,
  right: GigsWorkspaceChromeState,
): boolean {
  if (
    left.showManageButton !== right.showManageButton ||
    left.reserveManageSlot !== right.reserveManageSlot ||
    left.onManageClick !== right.onManageClick ||
    left.historySelectionMode !== right.historySelectionMode ||
    left.historySelectionSelectedCount !== right.historySelectionSelectedCount ||
    left.historySelectionAllSelected !== right.historySelectionAllSelected ||
    left.historySelectionRemoving !== right.historySelectionRemoving ||
    left.historySelectionCanToggleAll !== right.historySelectionCanToggleAll ||
    left.historySelectionCanDelete !== right.historySelectionCanDelete ||
    left.onHistorySelectionCancel !== right.onHistorySelectionCancel ||
    left.onHistorySelectionSelectAll !== right.onHistorySelectionSelectAll ||
    left.onHistorySelectionRemove !== right.onHistorySelectionRemove ||
    left.historyFeedbackMessage !== right.historyFeedbackMessage ||
    left.historyFeedbackFading !== right.historyFeedbackFading
  ) {
    return false;
  }

  if (left.counts === right.counts) {
    return true;
  }

  if (left.counts === null || right.counts === null) {
    return left.counts === right.counts;
  }

  return (
    left.counts.pending === right.counts.pending &&
    left.counts.accepted === right.counts.accepted &&
    left.counts.history === right.counts.history
  );
}

export function GigsWorkspaceChromeProvider({ children }: { children: ReactNode }) {
  const [chromeState, setChromeState] = useState<GigsWorkspaceChromeState>(() => {
    const cachedCounts = readGigsTabCountsCache();

    if (!cachedCounts) {
      return defaultGigsWorkspaceChromeState;
    }

    return {
      ...defaultGigsWorkspaceChromeState,
      counts: cachedCounts,
    };
  });

  return (
    <GigsWorkspaceChromeDispatchContext.Provider value={setChromeState}>
      <GigsWorkspaceChromeStateContext.Provider value={chromeState}>
        {children}
      </GigsWorkspaceChromeStateContext.Provider>
    </GigsWorkspaceChromeDispatchContext.Provider>
  );
}

export function useGigsWorkspaceChromeState(): GigsWorkspaceChromeState {
  return useContext(GigsWorkspaceChromeStateContext);
}

export function useSetGigsWorkspaceChromeState(): Dispatch<
  SetStateAction<GigsWorkspaceChromeState>
> {
  const setChromeState = useContext(GigsWorkspaceChromeDispatchContext);

  if (!setChromeState) {
    throw new Error("useSetGigsWorkspaceChromeState must be used within GigsWorkspaceChromeProvider");
  }

  return setChromeState;
}

export function GigsWorkspaceTabRow({
  activeView,
  counts,
  showManageButton = false,
  reserveManageSlot = false,
  onManageClick,
  historySelectionMode = false,
  historySelectionSelectedCount = 0,
  historySelectionAllSelected = false,
  historySelectionRemoving = false,
  historySelectionCanToggleAll = false,
  historySelectionCanDelete = false,
  onHistorySelectionCancel,
  onHistorySelectionSelectAll,
  onHistorySelectionRemove,
  historyFeedbackMessage = null,
  historyFeedbackFading = false,
}: {
  activeView: DjGigsListTab;
  counts: Record<DjGigsListTab, number> | null;
  showManageButton?: boolean;
  reserveManageSlot?: boolean;
  onManageClick?: () => void;
  historySelectionMode?: boolean;
  historySelectionSelectedCount?: number;
  historySelectionAllSelected?: boolean;
  historySelectionRemoving?: boolean;
  historySelectionCanToggleAll?: boolean;
  historySelectionCanDelete?: boolean;
  onHistorySelectionCancel?: () => void;
  onHistorySelectionSelectAll?: () => void;
  onHistorySelectionRemove?: () => void;
  historyFeedbackMessage?: string | null;
  historyFeedbackFading?: boolean;
}) {
  const historySelectionToolbar =
    historySelectionMode &&
    onHistorySelectionCancel &&
    onHistorySelectionSelectAll &&
    onHistorySelectionRemove ? (
      <HistorySelectionToolbar
        embedded
        tabRowEmbedded
        selectedCount={historySelectionSelectedCount}
        allSelected={historySelectionAllSelected}
        removing={historySelectionRemoving}
        onCancel={onHistorySelectionCancel}
        onSelectAll={onHistorySelectionSelectAll}
        onRemove={onHistorySelectionRemove}
        canToggleAll={historySelectionCanToggleAll}
        canDelete={historySelectionCanDelete}
        removeLabel="Delete"
        selectAllLabel="ALL"
        cancelVariant="backIcon"
        selectAllToggle
        centeredSelectAll
      />
    ) : null;

  return (
    <DjGigsTabRow
      showManageButton={showManageButton}
      reserveManageSlot={reserveManageSlot}
      onManageClick={onManageClick}
      selectionMode={historySelectionMode}
      selectionToolbar={historySelectionToolbar}
      feedbackMessage={historyFeedbackMessage}
      feedbackFading={historyFeedbackFading}
    >
      <DjGigsTabs
        activeView={activeView}
        counts={counts}
        hideHistoryTab={historySelectionMode}
      />
    </DjGigsTabRow>
  );
}

function resolveBookingsGigsActiveViewFromWindow(): DjGigsListTab {
  if (typeof window === "undefined") {
    return "pending";
  }

  return resolveGigsListTabForBookingsPage({
    nextPathname: window.location.pathname,
    searchParamsTab: new URLSearchParams(window.location.search).get("tab"),
    locationPathname: window.location.pathname,
    locationSearch: window.location.search,
  });
}

/** Single authoritative Gigs sub-tab value from the current route URL. */
export function useGigsListRouteTab(): DjGigsListTab {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeRevision = useSyncExternalStore(
    subscribeGigsListRouteRevision,
    readGigsListRouteRevision,
    () => 0,
  );

  useLayoutEffect(() => {
    function handlePopState() {
      bumpGigsListRouteRevision();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useLayoutEffect(() => {
    bumpGigsListRouteRevision();
  }, [searchParams]);

  return useMemo(
    () =>
      resolveGigsListTabForBookingsPage({
        nextPathname: pathname,
        searchParamsTab: searchParams.get("tab"),
        locationPathname: typeof window === "undefined" ? null : window.location.pathname,
        locationSearch: typeof window === "undefined" ? null : window.location.search,
      }),
    [pathname, searchParams, routeRevision],
  );
}

export function useDisplayedGigsListTab(routeTab: DjGigsListTab): DjGigsListTab {
  useSyncExternalStore(
    subscribeGigsListTabPending,
    readGigsListTabPending,
    () => null,
  );

  useLayoutEffect(() => {
    syncGigsListTabPendingWithRoute(routeTab);
  }, [routeTab]);

  useLayoutEffect(() => {
    function handlePopState() {
      clearGigsListTabPending();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return resolveDisplayedGigsListTab(routeTab);
}

function GigsWorkspaceSecondaryBandBody({
  activeView,
  role,
  plannerBookingCreateOpen,
}: {
  activeView: DjGigsListTab;
  role: UserRole | null;
  plannerBookingCreateOpen: boolean;
}) {
  const chromeState = useGigsWorkspaceChromeState();
  const showGigsTabs = !plannerBookingCreateOpen && canShowGigsWorkspaceTabs(role);
  const reserveManageSlot = !chromeState.showManageButton && chromeState.reserveManageSlot;

  if (!showGigsTabs) {
    return <PlannerWorkspaceSecondaryControlsPlaceholder />;
  }

  return (
    <PlannerWorkspaceSecondaryControls>
      <GigsWorkspaceTabRow
        activeView={activeView}
        counts={chromeState.counts}
        showManageButton={chromeState.showManageButton}
        reserveManageSlot={reserveManageSlot}
        onManageClick={chromeState.onManageClick}
        historySelectionMode={chromeState.historySelectionMode}
        historySelectionSelectedCount={chromeState.historySelectionSelectedCount}
        historySelectionAllSelected={chromeState.historySelectionAllSelected}
        historySelectionRemoving={chromeState.historySelectionRemoving}
        historySelectionCanToggleAll={chromeState.historySelectionCanToggleAll}
        historySelectionCanDelete={chromeState.historySelectionCanDelete}
        onHistorySelectionCancel={chromeState.onHistorySelectionCancel}
        onHistorySelectionSelectAll={chromeState.onHistorySelectionSelectAll}
        onHistorySelectionRemove={chromeState.onHistorySelectionRemove}
        historyFeedbackMessage={chromeState.historyFeedbackMessage}
        historyFeedbackFading={chromeState.historyFeedbackFading}
      />
    </PlannerWorkspaceSecondaryControls>
  );
}

export function GigsWorkspaceSecondaryBandFallback({
  role: roleProp,
  plannerBookingCreateOpen: plannerBookingCreateOpenProp,
}: {
  role?: UserRole | null;
  plannerBookingCreateOpen?: boolean;
} = {}) {
  const routeActiveView = resolveBookingsGigsActiveViewFromWindow();
  const activeView = useDisplayedGigsListTab(routeActiveView);
  const role = roleProp ?? readCachedNavRole();
  const plannerBookingCreateOpen =
    plannerBookingCreateOpenProp ??
    (typeof window === "undefined"
      ? false
      : isPlannerBookingsCreateChromeActive({
          locationSearch: window.location.search,
        }));

  return (
    <div className={PLANNER_WORKSPACE_SECONDARY_BAND_CLASS}>
      <GigsWorkspaceSecondaryBandBody
        activeView={activeView}
        role={role}
        plannerBookingCreateOpen={plannerBookingCreateOpen}
      />
    </div>
  );
}

export function GigsWorkspaceSecondaryBand({
  role: roleProp,
  plannerBookingCreateOpen: plannerBookingCreateOpenProp,
}: {
  role?: UserRole | null;
  plannerBookingCreateOpen?: boolean;
} = {}) {
  const role = roleProp ?? readCachedNavRole();
  const searchParams = useSearchParams();
  const plannerBookingCreateOpen =
    plannerBookingCreateOpenProp ??
    isPlannerBookingsCreateChromeActive({
      locationSearch:
        typeof window === "undefined"
          ? searchParams.toString()
            ? `?${searchParams.toString()}`
            : ""
          : window.location.search,
    });
  const routeActiveView = useGigsListRouteTab();
  const activeView = useDisplayedGigsListTab(routeActiveView);

  return (
    <div className={PLANNER_WORKSPACE_SECONDARY_BAND_CLASS}>
      <GigsWorkspaceSecondaryBandBody
        activeView={activeView}
        role={role}
        plannerBookingCreateOpen={plannerBookingCreateOpen}
      />
    </div>
  );
}
