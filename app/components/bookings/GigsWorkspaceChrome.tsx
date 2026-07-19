"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useSearchParams } from "next/navigation";
import { DjGigsTabs } from "@/app/components/bookings/DjGigsTabs";
import { DjGigsTabRow } from "@/app/components/skeleton/Skeleton";
import {
  PlannerWorkspaceSecondaryControlsPlaceholder,
  PLANNER_WORKSPACE_SECONDARY_BAND_CLASS,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { resolveGigsListTabParam } from "@/lib/bookings/gigsListNavigation";
import { isPlannerBookingsCreateChromeActive } from "@/lib/bookings/planDeepLink";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import type { DjGigsListTab } from "@/lib/bookingRequests";
import type { UserRole } from "@/lib/user/currentUser";

type GigsWorkspaceChromeState = {
  counts: Record<DjGigsListTab, number> | null;
  showManageButton: boolean;
  reserveManageSlot: boolean;
  onManageClick?: () => void;
};

const defaultChromeState: GigsWorkspaceChromeState = {
  counts: null,
  showManageButton: false,
  reserveManageSlot: false,
  onManageClick: undefined,
};

type GigsWorkspaceChromeContextValue = {
  chromeState: GigsWorkspaceChromeState;
  setChromeState: Dispatch<SetStateAction<GigsWorkspaceChromeState>>;
};

const GigsWorkspaceChromeContext = createContext<GigsWorkspaceChromeContextValue | null>(null);

export function GigsWorkspaceChromeProvider({ children }: { children: ReactNode }) {
  const [chromeState, setChromeState] = useState<GigsWorkspaceChromeState>(defaultChromeState);
  const value = useMemo(
    () => ({
      chromeState,
      setChromeState,
    }),
    [chromeState],
  );

  return (
    <GigsWorkspaceChromeContext.Provider value={value}>{children}</GigsWorkspaceChromeContext.Provider>
  );
}

export function useGigsWorkspaceChromeState() {
  const context = useContext(GigsWorkspaceChromeContext);

  if (!context) {
    throw new Error("useGigsWorkspaceChromeState must be used within GigsWorkspaceChromeProvider");
  }

  return context;
}

export function GigsWorkspaceTabRow({
  activeView,
  counts,
  showManageButton = false,
  reserveManageSlot = false,
  onManageClick,
}: {
  activeView: DjGigsListTab;
  counts: Record<DjGigsListTab, number> | null;
  showManageButton?: boolean;
  reserveManageSlot?: boolean;
  onManageClick?: () => void;
}) {
  return (
    <DjGigsTabRow
      showManageButton={showManageButton}
      reserveManageSlot={reserveManageSlot}
      onManageClick={onManageClick}
    >
      <DjGigsTabs activeView={activeView} counts={counts} />
    </DjGigsTabRow>
  );
}

function resolveBookingsGigsActiveView(searchParamsTab: string | null, locationSearch: string | null) {
  return resolveGigsListTabParam(searchParamsTab, null, locationSearch);
}

export function canShowGigsWorkspaceTabs(role: UserRole | null): boolean {
  return role === "dj" || role === "both" || role === null;
}

function resolveBookingsGigsActiveViewFromWindow(): DjGigsListTab {
  if (typeof window === "undefined") {
    return "pending";
  }

  return resolveBookingsGigsActiveView(
    new URLSearchParams(window.location.search).get("tab"),
    window.location.search,
  );
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
  const context = useContext(GigsWorkspaceChromeContext);
  const showGigsTabs = !plannerBookingCreateOpen && canShowGigsWorkspaceTabs(role);
  const chromeState = context?.chromeState ?? defaultChromeState;
  const reserveManageSlot =
    activeView === "history" &&
    !chromeState.showManageButton &&
    (chromeState.onManageClick == null || chromeState.reserveManageSlot);

  if (!showGigsTabs) {
    return <PlannerWorkspaceSecondaryControlsPlaceholder />;
  }

  return (
    <GigsWorkspaceTabRow
      activeView={activeView}
      counts={chromeState.counts}
      showManageButton={chromeState.showManageButton}
      reserveManageSlot={reserveManageSlot}
      onManageClick={chromeState.onManageClick}
    />
  );
}

export function GigsWorkspaceSecondaryBandFallback({
  role: roleProp,
  plannerBookingCreateOpen: plannerBookingCreateOpenProp,
}: {
  role?: UserRole | null;
  plannerBookingCreateOpen?: boolean;
} = {}) {
  const [activeView] = useState(resolveBookingsGigsActiveViewFromWindow);
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
  const searchParams = useSearchParams();
  const role = roleProp ?? readCachedNavRole();
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
  const activeView = resolveBookingsGigsActiveView(
    searchParams.get("tab"),
    typeof window === "undefined" ? null : window.location.search,
  );

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
