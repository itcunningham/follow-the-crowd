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
} from "@/app/components/layout/AppPageLayout";

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
} from "@/app/components/planner/PlannerWorkspaceLayout";

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
export const FTC_PILL_ROW_GAP_CLASS = "flex flex-wrap gap-2";

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

/** Standard transition for interactive surfaces. */
export const FTC_TRANSITION_SURFACE = "transition duration-150 ease-out motion-reduce:transition-none";
