/**
 * Planner workspace + shared app page layout class tokens (leaf module — no imports).
 * Components import from here; do not re-export these from PlannerWorkspaceLayout or AppPageLayout into ftcDesignSystem.
 */

/** Bottom padding for fixed mobile main nav; matches `AppNavigation` shell offset. */
export const MOBILE_NAV_OFFSET_CLASS =
  "ftc-mobile-nav-offset pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0";

export const PLANNER_WORKSPACE_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

/** Shared desktop width for Events, Event Plans, Calendar, and Gigs. */
export const PLANNER_CALENDAR_SHELL_CLASS = `mx-auto min-h-[100dvh] w-full max-w-2xl md:max-w-5xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_PAGE_SHELL_CLASS = PLANNER_CALENDAR_SHELL_CLASS;

export const PLANNER_WORKSPACE_SHELL_WIDE_CLASS = `mx-auto min-h-[100dvh] w-full max-w-6xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`;

export const PLANNER_WORKSPACE_PAGE_INSET_CLASS = "px-4 sm:px-6";

export const PLANNER_WORKSPACE_HEADER_CLASS = `ftc-page-header sticky top-0 z-50 isolate bg-ftc-bg ${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pt-4 md:pt-4`;

export const PLANNER_WORKSPACE_TITLE_CLASS = "text-xl font-semibold leading-tight text-ftc-text";

export const PLANNER_WORKSPACE_TITLE_ROW_CLASS =
  "relative flex min-h-[2.75rem] flex-wrap items-start justify-between gap-3 md:items-center";

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

/** Neutral app pages (Events workspace shell). Profile uses `AppProfilePageShell`. */
export const APP_PAGE_SHELL_CLASS = PLANNER_WORKSPACE_PAGE_SHELL_CLASS;
export const APP_PAGE_INSET_CLASS = PLANNER_WORKSPACE_PAGE_INSET_CLASS;
export const APP_PAGE_HEADER_CLASS = PLANNER_WORKSPACE_HEADER_CLASS;
export const APP_PAGE_BODY_CLASS = PLANNER_WORKSPACE_BODY_CLASS;
export const APP_PAGE_TITLE_CLASS = PLANNER_WORKSPACE_TITLE_CLASS;
export const APP_PAGE_TITLE_ROW_CLASS = PLANNER_WORKSPACE_TITLE_ROW_CLASS;
export const APP_PAGE_PRIMARY_SURFACE_CLASS = PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS;
