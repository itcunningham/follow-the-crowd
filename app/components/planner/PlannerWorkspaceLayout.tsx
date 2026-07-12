"use client";

import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import AppNavigation from "@/app/components/AppNavigation";
import type { UserRole } from "@/lib/user/currentUser";

export const PLANNER_WORKSPACE_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

/** Shared desktop width for Events, Event Plans, Calendar, and Gigs. */
export const PLANNER_CALENDAR_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl md:max-w-5xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_PAGE_SHELL_CLASS = PLANNER_CALENDAR_SHELL_CLASS;

export const PLANNER_WORKSPACE_SHELL_WIDE_CLASS = `mx-auto min-h-[100dvh] w-full max-w-6xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_HEADER_CLASS =
  "ftc-page-header px-4 pb-4 pt-4 sm:px-6 md:pt-4";

export const PLANNER_WORKSPACE_TITLE_CLASS = "text-xl font-semibold leading-tight text-ftc-text";

export const PLANNER_WORKSPACE_TITLE_ROW_CLASS =
  "flex flex-wrap items-start justify-between gap-3 md:min-h-[2.75rem]";

export const PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS =
  "flex shrink-0 items-start justify-end md:min-h-[2.625rem] md:min-w-[9.5rem]";

export const PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS = "mt-4 md:min-h-[2.375rem]";

export const PLANNER_WORKSPACE_CONTENT_CLASS = "px-4 py-4 sm:px-6";

export const PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS =
  "mb-4 flex flex-wrap items-center justify-between gap-2 md:min-h-[2.375rem]";

/** @deprecated Use PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS */
export const PLANNER_WORKSPACE_SECONDARY_TABS_ROW_CLASS = PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS;

function PlannerWorkspaceTitleActions({ actions }: { actions?: React.ReactNode }) {
  if (actions) {
    return <div className={PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS}>{actions}</div>;
  }

  return (
    <div aria-hidden="true" className={PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS}>
      <span className="pointer-events-none hidden opacity-0 md:inline-flex md:min-h-[2.625rem] md:min-w-[9rem] md:px-4 md:py-2.5" />
    </div>
  );
}

export function PlannerWorkspaceSecondaryControls({
  children,
  className = "",
}: {
  children: React.ReactNode;
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
}: {
  title: string;
  initialRole?: UserRole | null;
  actions?: React.ReactNode;
  showWorkspaceSubNav?: boolean;
  activeWorkspaceHref?: string | null;
}) {
  return (
    <header className={PLANNER_WORKSPACE_HEADER_CLASS}>
      <div className={PLANNER_WORKSPACE_TITLE_ROW_CLASS}>
        <h1 className={PLANNER_WORKSPACE_TITLE_CLASS}>{title}</h1>
        <PlannerWorkspaceTitleActions actions={actions} />
      </div>
      {showWorkspaceSubNav ? (
        <div className={PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS}>
          <PlannerEventsSubNav
            initialRole={initialRole}
            activeWorkspaceHref={activeWorkspaceHref}
          />
        </div>
      ) : (
        <div aria-hidden="true" className={PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS} />
      )}
    </header>
  );
}

type PlannerWorkspacePageProps = {
  title: string;
  initialRole?: UserRole | null;
  activeWorkspaceHref?: string | null;
  actions?: React.ReactNode;
  /** Pre-wrapped secondary row (e.g. EventsListTabRow with shared spacing class). */
  secondaryControlsSlot?: React.ReactNode;
  /** Wrapped automatically with PlannerWorkspaceSecondaryControls. */
  secondaryControls?: React.ReactNode;
  secondaryControlsPlaceholder?: boolean;
  children: React.ReactNode;
};

/** Shared Events-area page shell: nav, title row, primary tabs, divider, secondary controls, content. */
export function PlannerWorkspacePage({
  title,
  initialRole,
  activeWorkspaceHref,
  actions,
  secondaryControlsSlot,
  secondaryControls,
  secondaryControlsPlaceholder = false,
  children,
}: PlannerWorkspacePageProps) {
  return (
    <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <PlannerWorkspacePageHeader
        title={title}
        initialRole={initialRole}
        activeWorkspaceHref={activeWorkspaceHref}
        actions={actions}
      />
      <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
        {secondaryControlsSlot}
        {!secondaryControlsSlot && secondaryControlsPlaceholder ? (
          <PlannerWorkspaceSecondaryControlsPlaceholder />
        ) : null}
        {!secondaryControlsSlot && !secondaryControlsPlaceholder && secondaryControls ? (
          <PlannerWorkspaceSecondaryControls>{secondaryControls}</PlannerWorkspaceSecondaryControls>
        ) : null}
        {children}
      </div>
    </div>
  );
}
