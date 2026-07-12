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

/** Neutral app pages (Events workspace shell). Profile uses `AppProfilePageShell`. */
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

/** Shared desktop content width for DM inbox and conversation. */
export const APP_DM_CONTENT_WIDTH_CLASS =
  "mx-auto w-full max-w-2xl lg:max-w-[52rem]";

/** Profile page shell — same centred desktop width as DM inbox/conversation. */
export const APP_PAGE_PROFILE_SHELL_CLASS = APP_DM_CONTENT_WIDTH_CLASS;

/** Profile two-column content inside the shell. */
export const APP_PAGE_PROFILE_CONTENT_CLASS = "w-full";

export const APP_PAGE_PROFILE_GRID_CLASS =
  "space-y-6 md:grid md:grid-cols-[minmax(18rem,21.25rem)_minmax(0,1fr)] md:items-start md:gap-6 lg:gap-8 md:space-y-0";

export const APP_PAGE_PROFILE_PRIMARY_COLUMN_CLASS = "space-y-4";

export const APP_PAGE_PROFILE_SECONDARY_COLUMN_CLASS = "space-y-4 md:min-w-0";

export const APP_PAGE_PROFILE_IDENTITY_STACK_CLASS = "space-y-3";

export function AppProfilePageShell({ children }: { children: ReactNode }) {
  return (
    <AppPageShell>
      <div className={`${APP_PAGE_PROFILE_SHELL_CLASS} flex min-h-0 w-full flex-1 flex-col`}>
        {children}
      </div>
    </AppPageShell>
  );
}

/** Centered DM chat column — mobile/tablet stay max-w-2xl (672px); desktop ~832px (+24%). */
export const APP_DM_CHAT_COLUMN_CLASS =
  `${APP_DM_CONTENT_WIDTH_CLASS} flex min-h-0 flex-1 flex-col overflow-hidden`;
