"use client";

import "@/lib/navigationBadgePrefetch";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import AppNavigation from "@/app/components/AppNavigation";
import {
  mergeWorkspaceNavRole,
  resolvePlannerWorkspaceTitle,
} from "@/lib/plannerEventsNav";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";

export const PLANNER_WORKSPACE_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

/** Shared desktop width for Events, Event Plans, Calendar, and Gigs. */
export const PLANNER_CALENDAR_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl md:max-w-5xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_PAGE_SHELL_CLASS = PLANNER_CALENDAR_SHELL_CLASS;

export const PLANNER_WORKSPACE_SHELL_WIDE_CLASS = `mx-auto min-h-[100dvh] w-full max-w-6xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_PAGE_INSET_CLASS = "px-4 sm:px-6";

export const PLANNER_WORKSPACE_HEADER_CLASS = `ftc-page-header sticky top-0 z-50 isolate bg-ftc-bg ${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pb-4 pt-4 md:pt-4`;

export const PLANNER_WORKSPACE_TITLE_CLASS = "text-xl font-semibold leading-tight text-ftc-text";

export const PLANNER_WORKSPACE_TITLE_ROW_CLASS =
  "flex min-h-[2.75rem] flex-wrap items-start justify-between gap-3 md:items-center";

export const PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS =
  "flex shrink-0 items-start justify-end md:min-h-[2.625rem] md:min-w-[11.75rem] md:items-center";

export const PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS = "mt-4 min-h-11 md:min-h-11";

export const PLANNER_WORKSPACE_SUBNAV_ROW_CLASS =
  "relative -mx-4 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-4 touch-manipulation [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:overflow-x-auto md:px-0";

/** @deprecated Use PLANNER_WORKSPACE_PAGE_INSET_CLASS + body padding instead. */
export const PLANNER_WORKSPACE_CONTENT_CLASS = `${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pb-4 pt-4`;

export const PLANNER_WORKSPACE_BELOW_HEADER_CLASS = `relative z-0 ${PLANNER_WORKSPACE_PAGE_INSET_CLASS}`;

export const PLANNER_WORKSPACE_BODY_CLASS = "pb-4";

export const PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS =
  "mb-4 flex flex-wrap items-center justify-between gap-2 md:min-h-[2.375rem]";

export const PLANNER_WORKSPACE_SECONDARY_BAND_CLASS = "pt-4";

/** Primary desktop workspace surface (Calendar reference card shell). */
export const PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS = "ftc-card p-4 sm:p-5 md:p-6";

/** Shared vertical gap for list-style workspace content. */
export const PLANNER_WORKSPACE_LIST_CLASS = "space-y-3";

export const PLANNER_WORKSPACE_SUCCESS_BANNER_CLASS =
  "mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary";

/** @deprecated Use PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS */
export const PLANNER_WORKSPACE_SECONDARY_TABS_ROW_CLASS = PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS;

/** Matches the widest Events-area create button so title rows stay aligned. */
const PLANNER_WORKSPACE_TITLE_ACTION_PLACEHOLDER_CLASS =
  "pointer-events-none invisible inline-flex shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide";

type WorkspaceHeaderState = {
  activeWorkspaceHref?: string | null;
  actions?: ReactNode;
  workspaceRole?: UserRole | null;
  /** When true, sub-nav handled navigation (e.g. closed an in-page create flow). */
  interceptWorkspaceTabNavigation?: ((href: string) => boolean) | null;
};

function mergeWorkspaceHeaderState(
  previous: WorkspaceHeaderState,
  patch: WorkspaceHeaderState,
): WorkspaceHeaderState {
  const next: WorkspaceHeaderState = { ...previous };

  if ("activeWorkspaceHref" in patch) {
    next.activeWorkspaceHref = patch.activeWorkspaceHref;
  }

  if ("actions" in patch) {
    next.actions = patch.actions;
  }

  if ("interceptWorkspaceTabNavigation" in patch) {
    next.interceptWorkspaceTabNavigation = patch.interceptWorkspaceTabNavigation;
  }

  if (patch.workspaceRole != null) {
    next.workspaceRole = mergeWorkspaceNavRole(previous.workspaceRole, patch.workspaceRole);
  }

  return next;
}

type WorkspaceHeaderContextValue = {
  setHeaderState: (state: WorkspaceHeaderState) => void;
  resetHeaderStateForPathnameChange: () => void;
};

const WorkspaceHeaderContext = createContext<WorkspaceHeaderContextValue | null>(null);

function PlannerWorkspaceTitleActions({ actions }: { actions?: ReactNode }) {
  return (
    <div className={PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS}>
      {actions ?? (
        <span aria-hidden="true" className={PLANNER_WORKSPACE_TITLE_ACTION_PLACEHOLDER_CLASS}>
          Create event plan
        </span>
      )}
    </div>
  );
}

export function PlannerWorkspaceSecondaryControls({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS} ${className}`.trim()}>
      {children}
    </div>
  );
}

/** Reserves desktop secondary-control height when a page has no filter row (e.g. single-role Calendar). */
export function PlannerWorkspaceSecondaryControlsPlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`${PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS} hidden md:flex ${className}`.trim()}
    />
  );
}

export function PlannerWorkspacePageHeader({
  title,
  initialRole,
  actions,
  showWorkspaceSubNav = true,
  activeWorkspaceHref,
  interceptWorkspaceTabNavigation,
}: {
  title: string;
  initialRole?: UserRole | null;
  actions?: ReactNode;
  showWorkspaceSubNav?: boolean;
  activeWorkspaceHref?: string | null;
  interceptWorkspaceTabNavigation?: ((href: string) => boolean) | null;
}) {
  return (
    <header className={PLANNER_WORKSPACE_HEADER_CLASS}>
      <div className={PLANNER_WORKSPACE_TITLE_ROW_CLASS}>
        <h1 className={PLANNER_WORKSPACE_TITLE_CLASS}>{title}</h1>
        <PlannerWorkspaceTitleActions actions={actions} />
      </div>
      {showWorkspaceSubNav ? (
        <div className={PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS}>
          <div className={PLANNER_WORKSPACE_SUBNAV_ROW_CLASS}>
            <PlannerEventsSubNav
              initialRole={initialRole}
              activeWorkspaceHref={activeWorkspaceHref}
              interceptWorkspaceTabNavigation={interceptWorkspaceTabNavigation}
            />
          </div>
        </div>
      ) : (
        <div aria-hidden="true" className={PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS} />
      )}
    </header>
  );
}

function resolveDefaultWorkspaceActions(pathname: string, role: UserRole | null): ReactNode {
  if (pathname === "/events" && canManageEvents(role)) {
    return (
      <Link
        href="/events?create=event"
        className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
      >
        Create event
      </Link>
    );
  }

  if (pathname === "/booking-plans" || pathname.startsWith("/booking-plans/")) {
    return (
      <Link
        href="/booking-plans"
        className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
      >
        Create event plan
      </Link>
    );
  }

  return undefined;
}

/** Persistent workspace shell: nav, title row, and primary tabs stay mounted across route transitions. */
export function PlannerWorkspaceRouteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const guardProfile = useGuardProfile();
  const [headerState, setHeaderStateInternal] = useState<WorkspaceHeaderState>({});
  const [syncedPathname, setSyncedPathname] = useState(pathname);
  const layoutRole = mergeWorkspaceNavRole(guardProfile?.role, readCachedNavRole());

  const setHeaderState = useCallback((patch: WorkspaceHeaderState) => {
    setHeaderStateInternal((previous) => mergeWorkspaceHeaderState(previous, patch));
  }, []);

  const resetHeaderStateForPathnameChange = useCallback(() => {
    setHeaderStateInternal((previous) => ({
      workspaceRole: previous.workspaceRole,
    }));
  }, []);

  if (pathname !== syncedPathname) {
    setSyncedPathname(pathname);
    resetHeaderStateForPathnameChange();
  }

  const title = useMemo(
    () =>
      resolvePlannerWorkspaceTitle({
        pathname,
        activeWorkspaceHref: headerState.activeWorkspaceHref,
      }),
    [headerState.activeWorkspaceHref, pathname],
  );
  const actions = headerState.actions ?? resolveDefaultWorkspaceActions(pathname, layoutRole);
  const workspaceRole = mergeWorkspaceNavRole(headerState.workspaceRole, layoutRole);
  const headerContextValue = useMemo<WorkspaceHeaderContextValue>(
    () => ({
      setHeaderState,
      resetHeaderStateForPathnameChange,
    }),
    [resetHeaderStateForPathnameChange, setHeaderState],
  );

  const workspaceIntercept =
    pathname === "/calendar" || pathname.startsWith("/calendar/")
      ? null
      : headerState.interceptWorkspaceTabNavigation;

  return (
    <WorkspaceHeaderContext.Provider value={headerContextValue}>
      <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
        <AppNavigation />
        <PlannerWorkspacePageHeader
          title={title}
          initialRole={workspaceRole}
          activeWorkspaceHref={headerState.activeWorkspaceHref}
          interceptWorkspaceTabNavigation={workspaceIntercept}
          actions={actions}
        />
        <div className={PLANNER_WORKSPACE_BELOW_HEADER_CLASS}>{children}</div>
      </div>
    </WorkspaceHeaderContext.Provider>
  );
}

type PlannerWorkspacePageContentProps = {
  activeWorkspaceHref?: string | null;
  actions?: ReactNode;
  initialRole?: UserRole | null;
  interceptWorkspaceTabNavigation?: ((href: string) => boolean) | null;
  /** Pre-wrapped secondary row (e.g. EventsListTabRow with shared spacing class). */
  secondaryControlsSlot?: ReactNode;
  /** Wrapped automatically with PlannerWorkspaceSecondaryControls. */
  secondaryControls?: ReactNode;
  secondaryControlsPlaceholder?: boolean;
  /** When true, skip the secondary band entirely (e.g. Gigs tabs live in bookings/layout). */
  omitSecondaryBand?: boolean;
  children: ReactNode;
};

function renderSecondaryBand({
  secondaryControlsSlot,
  secondaryControls,
  secondaryControlsPlaceholder,
  omitSecondaryBand,
}: Pick<
  PlannerWorkspacePageContentProps,
  "secondaryControlsSlot" | "secondaryControls" | "secondaryControlsPlaceholder" | "omitSecondaryBand"
>) {
  if (omitSecondaryBand) {
    return null;
  }

  if (secondaryControlsSlot) {
    return secondaryControlsSlot;
  }

  if (secondaryControlsPlaceholder) {
    return <PlannerWorkspaceSecondaryControlsPlaceholder />;
  }

  if (secondaryControls) {
    return (
      <PlannerWorkspaceSecondaryControls>{secondaryControls}</PlannerWorkspaceSecondaryControls>
    );
  }

  return <PlannerWorkspaceSecondaryControlsPlaceholder />;
}

/** Workspace page body below the persistent tab row. */
export function PlannerWorkspacePageContent({
  activeWorkspaceHref,
  actions,
  initialRole,
  interceptWorkspaceTabNavigation,
  secondaryControlsSlot,
  secondaryControls,
  secondaryControlsPlaceholder = false,
  omitSecondaryBand = false,
  children,
}: PlannerWorkspacePageContentProps) {
  const headerContext = useContext(WorkspaceHeaderContext);
  const secondaryBand = renderSecondaryBand({
    secondaryControlsSlot,
    secondaryControls,
    secondaryControlsPlaceholder,
    omitSecondaryBand,
  });

  useLayoutEffect(() => {
    if (!headerContext) {
      return;
    }

    headerContext.setHeaderState({
      activeWorkspaceHref,
      actions,
      workspaceRole: initialRole,
      interceptWorkspaceTabNavigation,
    });
  }, [actions, activeWorkspaceHref, headerContext, initialRole, interceptWorkspaceTabNavigation]);

  return (
    <>
      {secondaryBand ? (
        <div className={PLANNER_WORKSPACE_SECONDARY_BAND_CLASS}>{secondaryBand}</div>
      ) : null}
      <div className={PLANNER_WORKSPACE_BODY_CLASS}>{children}</div>
    </>
  );
}

type PlannerWorkspacePageProps = PlannerWorkspacePageContentProps & {
  title?: string;
  initialRole?: UserRole | null;
  /** When false, render only page content (persistent chrome lives in PlannerWorkspaceRouteLayout). */
  includeChrome?: boolean;
};

/** Shared Events-area page shell: nav, title row, primary tabs, divider, secondary controls, content. */
export function PlannerWorkspacePage({
  title: titleProp,
  initialRole,
  activeWorkspaceHref,
  actions,
  interceptWorkspaceTabNavigation,
  secondaryControlsSlot,
  secondaryControls,
  secondaryControlsPlaceholder = false,
  omitSecondaryBand = false,
  includeChrome = true,
  children,
}: PlannerWorkspacePageProps) {
  const pathname = usePathname();
  const title = useMemo(
    () =>
      titleProp ??
      resolvePlannerWorkspaceTitle({
        pathname,
        activeWorkspaceHref,
      }),
    [activeWorkspaceHref, pathname, titleProp],
  );
  const content = (
    <PlannerWorkspacePageContent
      activeWorkspaceHref={activeWorkspaceHref}
      actions={actions}
      initialRole={initialRole}
      interceptWorkspaceTabNavigation={interceptWorkspaceTabNavigation}
      secondaryControlsSlot={secondaryControlsSlot}
      secondaryControls={secondaryControls}
      secondaryControlsPlaceholder={secondaryControlsPlaceholder}
      omitSecondaryBand={omitSecondaryBand}
    >
      {children}
    </PlannerWorkspacePageContent>
  );

  if (!includeChrome) {
    return content;
  }

  return (
    <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <PlannerWorkspacePageHeader
        title={title}
        initialRole={initialRole}
        activeWorkspaceHref={activeWorkspaceHref}
        actions={actions}
      />
      <div className={PLANNER_WORKSPACE_BELOW_HEADER_CLASS}>{content}</div>
    </div>
  );
}
