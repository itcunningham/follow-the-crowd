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
import AppNavigation from "@/app/components/AppNavigation";
import {
  PLANNER_WORKSPACE_BELOW_HEADER_CLASS,
  PLANNER_WORKSPACE_BODY_CLASS,
  PLANNER_WORKSPACE_HEADER_CLASS,
  PLANNER_WORKSPACE_PAGE_SHELL_CLASS,
  PLANNER_WORKSPACE_SECONDARY_BAND_CLASS,
  PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS,
  PLANNER_WORKSPACE_SUBNAV_ROW_CLASS,
  PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS,
  PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS,
  PLANNER_WORKSPACE_TITLE_CLASS,
  PLANNER_WORKSPACE_TITLE_ROW_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";
import {
  mergeWorkspaceNavRole,
  resolvePlannerWorkspaceTitle,
} from "@/lib/plannerEventsNav";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS } from "@/lib/design/inlineTabFeedback";

/** Matches the widest Events-area create button so title rows stay aligned. */
const PLANNER_WORKSPACE_TITLE_ACTION_PLACEHOLDER_CLASS =
  "pointer-events-none invisible inline-flex shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide";

type WorkspaceHeaderState = {
  activeWorkspaceHref?: string | null;
  actions?: ReactNode;
  workspaceRole?: UserRole | null;
  /** When true, sub-nav handled navigation (e.g. closed an in-page create flow). */
  interceptWorkspaceTabNavigation?: ((href: string) => boolean) | null;
  titleFeedbackMessage?: string | null;
  titleFeedbackFading?: boolean;
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

  if ("titleFeedbackMessage" in patch) {
    next.titleFeedbackMessage = patch.titleFeedbackMessage;
  }

  if ("titleFeedbackFading" in patch) {
    next.titleFeedbackFading = patch.titleFeedbackFading;
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

export function useSetPlannerWorkspaceHeaderState(): WorkspaceHeaderContextValue["setHeaderState"] {
  const headerContext = useContext(WorkspaceHeaderContext);

  if (!headerContext) {
    throw new Error("useSetPlannerWorkspaceHeaderState must be used within PlannerWorkspaceRouteLayout");
  }

  return headerContext.setHeaderState;
}

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
  titleFeedbackMessage = null,
  titleFeedbackFading = false,
}: {
  title: string;
  initialRole?: UserRole | null;
  actions?: ReactNode;
  showWorkspaceSubNav?: boolean;
  activeWorkspaceHref?: string | null;
  interceptWorkspaceTabNavigation?: ((href: string) => boolean) | null;
  titleFeedbackMessage?: string | null;
  titleFeedbackFading?: boolean;
}) {
  return (
    <header className={PLANNER_WORKSPACE_HEADER_CLASS}>
      <div className={PLANNER_WORKSPACE_TITLE_ROW_CLASS}>
        <h1 className={`${PLANNER_WORKSPACE_TITLE_CLASS} shrink-0`}>{title}</h1>
        <div
          className="pointer-events-none absolute inset-x-0 flex min-h-[2.75rem] items-center justify-center px-16 sm:px-20 md:px-[12.5rem]"
          aria-live={titleFeedbackMessage ? "polite" : undefined}
        >
          {titleFeedbackMessage ? (
            <p
              className={`${PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS} ${
                titleFeedbackFading ? "opacity-0" : "opacity-100"
              }`}
            >
              {titleFeedbackMessage}
            </p>
          ) : null}
        </div>
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
          titleFeedbackMessage={headerState.titleFeedbackMessage ?? null}
          titleFeedbackFading={headerState.titleFeedbackFading ?? false}
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
    return (
      <PlannerWorkspaceSecondaryControls>{secondaryControlsSlot}</PlannerWorkspaceSecondaryControls>
    );
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
