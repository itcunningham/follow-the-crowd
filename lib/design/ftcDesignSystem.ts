/**
 * FTC design system tokens — class-name exports for shared UI.
 * Source of truth for humans: `docs/design/FTC_DESIGN_SYSTEM.md`
 * CSS implementation: `app/globals.css`
 */

export {
  APP_PAGE_BODY_CLASS,
  APP_PAGE_HEADER_CLASS,
  APP_PAGE_INSET_CLASS,
  APP_PAGE_PRIMARY_SURFACE_CLASS,
  APP_PAGE_SHELL_CLASS,
  APP_PAGE_TITLE_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

export {
  PLANNER_WORKSPACE_BODY_CLASS,
  PLANNER_WORKSPACE_HEADER_CLASS,
  PLANNER_WORKSPACE_LIST_CLASS,
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
  PLANNER_WORKSPACE_PAGE_SHELL_CLASS,
  PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS,
  PLANNER_WORKSPACE_SECONDARY_BAND_CLASS,
  PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS,
  PLANNER_WORKSPACE_TITLE_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

export {
  getFtcStatusBadgeSizeClass,
  FTC_STATUS_BADGE_COMPACT_CLASS,
  FTC_STATUS_BADGE_DEFAULT_CLASS,
} from "@/lib/design/ftcStatusBadge";

/** In-card section heading (Event Details, form sections). */
export const FTC_SECTION_TITLE_CLASS = "ftc-section-title";

/** Discover / grouped list section heading. */
export const FTC_PAGE_SECTION_TITLE_CLASS = "ftc-page-section-title";

/** Default card padding — list rows, forms, planner surfaces. */
export const FTC_CARD_PADDING_CLASS = "p-4 sm:p-5";

/** Compact card padding — nested detail panels. */
export const FTC_CARD_PADDING_COMPACT_CLASS = "p-3.5 sm:p-4";

/** List row surface (Events, Gigs, History). */
export const FTC_SURFACE_ROW_CLASS =
  "ftc-surface-row rounded-[var(--ftc-radius-xl)] p-4 text-left sm:p-5";

/** Standard vertical list gap. */
export const FTC_LIST_GAP_CLASS = "space-y-3";

/** Filter / status pill row gap. */
export const FTC_PILL_ROW_GAP_CLASS = "flex flex-wrap items-center gap-2";

/** Events Active/History pill row — nowrap so pills never wrap during route load. */
export const FTC_EVENTS_LIST_TAB_PILL_ROW_CLASS = "flex shrink-0 flex-nowrap items-center gap-2";

/** Shared filter pill layout — keeps active/inactive pills aligned in a row. */
export const FTC_FILTER_PILL_CLASS = "inline-flex items-center ftc-filter-pill";

/** Stable outer box for Events Active/History pills (active state must not change size). */
export const FTC_EVENTS_LIST_TAB_PILL_MODIFIER_CLASS = "ftc-events-list-tab-pill";

export function ftcFilterPillClass(isActive: boolean): string {
  return `${FTC_FILTER_PILL_CLASS}${isActive ? " ftc-filter-pill-active" : ""}`;
}

export function eventsListTabPillClass(isActive: boolean): string {
  return `${FTC_FILTER_PILL_CLASS} ${FTC_EVENTS_LIST_TAB_PILL_MODIFIER_CLASS}${isActive ? " ftc-filter-pill-active" : ""}`;
}

/** Shared Create event control in Events workspace title row. */
export const EVENTS_CREATE_EVENT_BUTTON_CLASS =
  "shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide";

export { WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS } from "@/lib/design/workspaceSubNavBadge";
/** Space between Gigs Incoming/Confirmed label and count (~6px). */
export const GIGS_TAB_PILL_GAP_CLASS = "gap-1.5";

/** Modifier for Incoming/Confirmed/History pills — tighter horizontal padding, same vertical sizing. */
export const GIGS_TAB_PILL_MODIFIER_CLASS = "ftc-gigs-tab-pill";

/** Incoming/Confirmed only — pairs with inner label+count row (padding shared on all gigs pills). */
export const GIGS_TAB_PILL_WITH_COUNT_MODIFIER_CLASS = "ftc-gigs-tab-pill-with-count";

/** Label inside Incoming/Confirmed inner row. */
export const GIGS_TAB_PILL_LABEL_CLASS = "shrink-0";

/** Count beside Incoming/Confirmed labels — stable width through 99+, vertically centred. */
export const GIGS_TAB_COUNT_SLOT_CLASS =
  "ftc-gigs-tab-count-slot inline-block shrink-0 tabular-nums";

export function gigsTabPillClass(isActive: boolean, withCount = false): string {
  const modifiers = [GIGS_TAB_PILL_MODIFIER_CLASS];
  if (withCount) {
    modifiers.push(GIGS_TAB_PILL_WITH_COUNT_MODIFIER_CLASS);
  }
  return `${FTC_FILTER_PILL_CLASS} ${modifiers.join(" ")}${isActive ? " ftc-filter-pill-active" : ""}`;
}

/** Gigs Incoming/Confirmed/History pill group — compact cluster, no stretch. */
export const GIGS_TAB_PILL_ROW_CLASS = "flex shrink-0 flex-nowrap items-center gap-2";

/** Gigs filter row — Incoming/Confirmed/History left, manage action right. */
export const GIGS_LIST_TAB_ROW_CLASS =
  "flex h-[1.875rem] max-h-[1.875rem] min-h-[1.875rem] w-full flex-nowrap items-center justify-between gap-2 md:h-[2.375rem] md:max-h-[2.375rem] md:min-h-[2.375rem]";

/** Events list tab row — trash action matches filter pill height (30px). */
export const FTC_EVENTS_LIST_TAB_ACTION_CLASS =
  "inline-flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-muted transition enabled:hover:border-ftc-border-strong enabled:hover:text-ftc-text-secondary disabled:cursor-not-allowed disabled:opacity-50";

/** Invisible slot reserved on Active so History trash does not shift layout. */
export const FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS =
  "inline-flex h-[1.875rem] w-[1.875rem] shrink-0 invisible pointer-events-none";

/** Gigs list tab row — manage action matches tab row height (30px). */
export const GIGS_LIST_TAB_ACTION_CLASS = FTC_EVENTS_LIST_TAB_ACTION_CLASS;

/** Invisible slot reserved on Incoming/Confirmed so History manage action does not shift layout. */
export const GIGS_MANAGE_BUTTON_PLACEHOLDER_CLASS = FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS;

/** Events Active/History tab row — fixed height; filters left, page actions right (`w-full`). */
export const EVENTS_LIST_TAB_ROW_CLASS =
  "flex h-[1.875rem] max-h-[1.875rem] min-h-[1.875rem] w-full flex-nowrap items-center gap-2 md:h-[2.375rem] md:max-h-[2.375rem] md:min-h-[2.375rem]";

/** Inline history-remove feedback beside History tab (truncate, no row growth). */
export const EVENTS_LIST_TAB_FEEDBACK_CLASS =
  "min-w-0 truncate text-[11px] font-normal leading-none text-ftc-text-muted transition-opacity duration-300 sm:text-xs";

/** Event Plans toolbar row — fixed height for trash ↔ delete-selection swap. */
export const EVENT_PLANS_TOOLBAR_ROW_CLASS = "relative h-[3.125rem] w-full shrink-0";

/** Event Plans card — layout-only reserve matching Use plan width in delete-selection mode. */
export const EVENT_PLAN_ACTION_RESERVE_CLASS =
  "h-11 w-[5.5rem] shrink-0 self-center";

/** Event Plans card — vertically centred Use plan column. */
export const EVENT_PLAN_USE_BUTTON_WRAP_CLASS =
  "shrink-0 self-center sm:flex sm:justify-end";

/** Event Plans card — shared sizing for live and reserved Use plan buttons. */
export const EVENT_PLAN_USE_BUTTON_CLASS =
  "ftc-btn-secondary inline-flex min-h-11 items-center justify-center border-[1.5px] border-ftc-border-strong px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text";

/** Event Plans title action — shared sizing for live and reserved Create button. */
export const EVENT_PLANS_CREATE_BUTTON_CLASS =
  "inline-flex shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide";

/** Workspace header primary action button. */
export const FTC_BTN_WORKSPACE_PRIMARY_CLASS =
  "ftc-btn-primary shrink-0 px-4 py-2.5 text-sm uppercase tracking-wide";

/** Form / detail inline primary action. */
export const FTC_BTN_FORM_PRIMARY_CLASS =
  "ftc-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

/** Form / detail inline secondary action. */
export const FTC_BTN_FORM_SECONDARY_CLASS =
  "ftc-btn-secondary inline-flex min-h-10 items-center justify-center px-3 py-2 text-xs uppercase tracking-wide";

/** Page-level empty state shell. */
export const FTC_EMPTY_STATE_PAGE_CLASS = "ftc-card-empty ftc-empty-state-page";

/** Inline section empty state shell. */
export const FTC_EMPTY_STATE_PANEL_CLASS = "ftc-card-empty ftc-empty-state-panel";

/** Standard icon button (header overlays, manage history). */
export const FTC_ICON_BUTTON_CLASS =
  "ftc-icon-btn inline-flex h-10 w-10 shrink-0 items-center justify-center";

/** Compact manage icon button (history trash). */
export const FTC_ICON_BUTTON_SM_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-muted transition enabled:hover:border-ftc-border-strong enabled:hover:text-ftc-text-secondary disabled:cursor-not-allowed disabled:opacity-50";

/** Event list thumbnail — fixed 64px square. */
export const FTC_EVENT_THUMB_LIST_SIZE = "list" as const;

/** Events / Gigs list card — artwork + body row (matches EventsPageClient). */
export const FTC_LIST_CARD_ROW_CLASS =
  "flex min-w-0 max-w-full items-start gap-2 text-left sm:gap-2.5";

export const FTC_LIST_CARD_ARTWORK_CLASS = "shrink-0 self-start";

export const FTC_LIST_CARD_BODY_CLASS =
  "flex min-w-0 flex-1 flex-col gap-1 overflow-hidden text-left sm:gap-3";

/** Gigs card Open DM — outlined secondary, slightly narrower than Event Plans Use plan. */
export const GIG_CARD_OPEN_DM_BUTTON_CLASS =
  "ftc-btn-secondary inline-flex min-h-11 shrink-0 items-center justify-center border-[1.5px] border-ftc-border-strong px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text";

/** Standard transition for interactive surfaces. */
export const FTC_TRANSITION_SURFACE = "transition duration-150 ease-out motion-reduce:transition-none";
