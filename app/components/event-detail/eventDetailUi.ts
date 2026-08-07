/** Shared layout tokens for the Event Details planner flow. */
import {
  MOBILE_NAV_OFFSET_CLASS,
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

export const EVENT_DETAIL_PAGE_SHELL_CLASS =
  "mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text";

/** Scrollable Event Details body — mobile nav offset must live here, not only on the shell. */
export const EVENT_DETAIL_PAGE_CONTENT_CLASS = `${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pt-5 ${MOBILE_NAV_OFFSET_CLASS} md:pb-6`;

export function getEventDetailPageContentBottomClass(showBottomBar: boolean): string {
  return showBottomBar ? "pb-28" : "";
}

export const EVENT_DETAIL_SECTION_SPACING = "mt-8";

export const EVENT_DETAIL_NOTES_TEXT_CLASS = "ftc-event-detail-notes-text";

export const EVENT_DETAIL_CARD_CLASS = "ftc-card p-3.5 sm:p-4";

export const EVENT_DETAIL_SECTION_TITLE_CLASS = "ftc-section-title";

export const EVENT_DETAIL_SECTION_SUBTITLE_CLASS = "mt-1 text-xs text-ftc-text-muted";

export const EVENT_DETAIL_FEEDBACK_CLASS =
  "mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3.5 py-3 text-sm";

export const EVENT_DETAIL_BTN_PRIMARY =
  "ftc-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

export const EVENT_DETAIL_BTN_PRIMARY_WIDE =
  "ftc-btn-primary inline-flex min-h-10 w-full items-center justify-center px-4 py-2 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

export const EVENT_DETAIL_BTN_SECONDARY =
  "ftc-btn-secondary inline-flex min-h-10 items-center justify-center px-3 py-2 text-xs uppercase tracking-wide";

export const EVENT_DETAIL_BTN_DESTRUCTIVE =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--ftc-color-danger)] bg-ftc-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ftc-color-danger)] transition hover:border-0 hover:bg-[var(--ftc-color-danger)] hover:text-ftc-bg disabled:cursor-not-allowed disabled:opacity-50";

/** Armed Decline (CONFIRM) on Event Details — solid danger fill. */
export const EVENT_DETAIL_BTN_DESTRUCTIVE_ARMED =
  "inline-flex min-h-10 items-center justify-center rounded-xl border-0 bg-[var(--ftc-color-danger)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-bg transition disabled:cursor-not-allowed disabled:opacity-50";

export const EVENT_DETAIL_LINEUP_ACTIONS_ROW = "mt-2 flex gap-1.5";

/** Shared size for Message / Cancel — `!` beats `.ftc-btn-secondary` and DM compact `min-h-9`. */
export const EVENT_DETAIL_LINEUP_ACTION_BTN =
  "!min-h-7 min-w-0 flex-1 !px-2 !py-0.5 !text-[11px]";

/** Standalone border styles — do not use `ftc-btn-secondary` (globals force 2.5rem min-height). */
export const EVENT_DETAIL_LINEUP_BTN_SECONDARY =
  "inline-flex !min-h-7 items-center justify-center rounded-xl border border-ftc-border-strong bg-ftc-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary hover:text-ftc-primary";

export const EVENT_DETAIL_BADGE_COMPACT =
  "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide";
