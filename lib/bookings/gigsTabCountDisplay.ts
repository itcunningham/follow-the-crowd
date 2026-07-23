/** Maximum numeric value shown on Gigs tab / sub-nav count badges before capping. */
export const GIGS_TAB_COUNT_MAX_DISPLAY = 99;

/** Visible badge text for Gigs Incoming/Confirmed counts and workspace Gigs pending badge. */
export function formatGigsTabCountDisplay(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  if (count > GIGS_TAB_COUNT_MAX_DISPLAY) {
    return "99+";
  }

  return String(count);
}

/** Screen-reader count when the visible label may be capped at 99+. */
export function formatGigsTabCountAriaCount(count: number): string {
  if (count > GIGS_TAB_COUNT_MAX_DISPLAY) {
    return "more than 99";
  }

  return String(count);
}
