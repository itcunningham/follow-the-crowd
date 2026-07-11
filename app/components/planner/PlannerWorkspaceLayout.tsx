"use client";

import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import type { UserRole } from "@/lib/user/currentUser";

export const PLANNER_WORKSPACE_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_CALENDAR_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl md:max-w-5xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_SHELL_WIDE_CLASS = `mx-auto min-h-[100dvh] w-full max-w-6xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_HEADER_CLASS = "ftc-page-header px-4 py-4 sm:px-6 md:pt-4";

export const PLANNER_WORKSPACE_TITLE_CLASS = "text-xl font-semibold text-ftc-text";

export const PLANNER_WORKSPACE_CONTENT_CLASS = "px-4 py-4 sm:px-6";

export const PLANNER_WORKSPACE_SECONDARY_TABS_ROW_CLASS =
  "mb-4 flex flex-wrap items-center justify-between gap-2";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className={PLANNER_WORKSPACE_TITLE_CLASS}>{title}</h1>
        {actions}
      </div>
      {showWorkspaceSubNav ? (
        <PlannerEventsSubNav
          initialRole={initialRole}
          activeWorkspaceHref={activeWorkspaceHref}
        />
      ) : null}
    </header>
  );
}
