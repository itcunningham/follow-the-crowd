/** Flat solid status fills — no glow, no transparent neon borders */

export const FTC_STATUS_PRIMARY = "border-0 bg-ftc-primary text-ftc-bg";

/** Today — highest-priority event date status; uses FTC primary light blue */
export const FTC_STATUS_TODAY = FTC_STATUS_PRIMARY;
export const FTC_STATUS_TODAY_DOT = "bg-ftc-primary";

/** Upcoming — muted steel navy used for future event dates */
export const FTC_STATUS_UPCOMING =
  "border-0 bg-[var(--ftc-color-upcoming)] text-white";
export const FTC_STATUS_UPCOMING_DOT = "bg-[var(--ftc-color-upcoming)]";

/** Pending — booking requests awaiting response */
export const FTC_STATUS_WARNING = "border-0 bg-[var(--ftc-color-warning)] text-ftc-bg";
export const FTC_STATUS_PENDING = FTC_STATUS_WARNING;
export const FTC_STATUS_PENDING_DOT = "bg-[var(--ftc-color-warning)]";

/** Accepted — confirmed bookings */
export const FTC_STATUS_SUCCESS = "border-0 bg-[var(--ftc-color-success)] text-ftc-bg";
export const FTC_STATUS_ACCEPTED = FTC_STATUS_SUCCESS;
export const FTC_STATUS_ACCEPTED_DOT = "bg-[var(--ftc-color-success)]";

export const FTC_STATUS_DANGER = "border-0 bg-[var(--ftc-color-danger)] text-ftc-bg";
export const FTC_STATUS_NEUTRAL = "border border-ftc-border-subtle bg-slate-600 text-slate-100";
export const FTC_STATUS_MUTED =
  "border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary";

export const FTC_CAL_CELL = "block w-full rounded-md border-0 py-1.5 sm:py-2";

export const FTC_ICON_BTN =
  "flex items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-muted transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated hover:text-ftc-text focus:outline-none focus-visible:border-ftc-border-strong";

export const FTC_ICON_BTN_ACTIVE =
  "flex items-center justify-center rounded-xl border-0 bg-ftc-primary text-ftc-bg";

export const FTC_CHIP_SELECTED = "border-0 bg-ftc-primary text-ftc-bg";
export const FTC_CHIP_DEFAULT =
  "border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary";

export function getFlatAvailabilityFillClass(
  status: "available" | "tentative" | "unavailable",
): string {
  switch (status) {
    case "available":
      return FTC_STATUS_PRIMARY;
    case "tentative":
      return FTC_STATUS_WARNING;
    case "unavailable":
      return FTC_STATUS_DANGER;
  }
}

export function getFlatBookingFillClass(status: "pending" | "accepted"): string {
  return status === "pending" ? FTC_STATUS_PENDING : FTC_STATUS_ACCEPTED;
}
