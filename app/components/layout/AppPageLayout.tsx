"use client";

import type { ReactNode } from "react";
import AppNavigation from "@/app/components/AppNavigation";
import {
  PLANNER_WORKSPACE_BODY_CLASS,
  PLANNER_WORKSPACE_HEADER_CLASS,
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
  PLANNER_WORKSPACE_PAGE_SHELL_CLASS,
  PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS,
  PLANNER_WORKSPACE_TITLE_CLASS,
  PLANNER_WORKSPACE_TITLE_ROW_CLASS,
} from "@/app/components/planner/PlannerWorkspaceLayout";

/** Neutral app pages (Messages, Profile) — same desktop width as Events workspace. */
export const APP_PAGE_SHELL_CLASS = PLANNER_WORKSPACE_PAGE_SHELL_CLASS;
export const APP_PAGE_INSET_CLASS = PLANNER_WORKSPACE_PAGE_INSET_CLASS;
export const APP_PAGE_HEADER_CLASS = PLANNER_WORKSPACE_HEADER_CLASS;
export const APP_PAGE_BODY_CLASS = PLANNER_WORKSPACE_BODY_CLASS;
export const APP_PAGE_TITLE_CLASS = PLANNER_WORKSPACE_TITLE_CLASS;
export const APP_PAGE_TITLE_ROW_CLASS = PLANNER_WORKSPACE_TITLE_ROW_CLASS;
export const APP_PAGE_PRIMARY_SURFACE_CLASS = PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS;

export function AppPageShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${APP_PAGE_SHELL_CLASS} flex flex-col`}>
      <AppNavigation />
      {children}
    </div>
  );
}

export function AppPageBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-1 ${APP_PAGE_INSET_CLASS} ${APP_PAGE_BODY_CLASS} ${className}`.trim()}>
      {children}
    </div>
  );
}

/** Desktop-only card wrapper; no visual change on mobile. */
export function AppPageDesktopSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`md:ftc-card md:p-5 lg:p-6 ${className}`.trim()}>{children}</div>
  );
}

/** Profile view/edit content width on desktop — wider than mobile column, not full monitor. */
export const APP_PAGE_PROFILE_CONTENT_CLASS =
  "mx-auto w-full max-w-lg md:max-w-none";

export const APP_PAGE_PROFILE_GRID_CLASS =
  "space-y-6 md:grid md:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] md:items-start md:gap-8 md:space-y-0";

export const APP_PAGE_PROFILE_PRIMARY_COLUMN_CLASS = "space-y-6";

export const APP_PAGE_PROFILE_SECONDARY_COLUMN_CLASS = "space-y-4 md:pt-0";
