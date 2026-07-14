/** Shared status badge geometry — use with semantic fill classes from `@/lib/ftcFlatStatus`. */

export const FTC_STATUS_BADGE_COMPACT_CLASS =
  "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide";

export const FTC_STATUS_BADGE_DEFAULT_CLASS =
  "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide";

export function getFtcStatusBadgeSizeClass(variant: "default" | "compact" = "default"): string {
  return variant === "compact" ? FTC_STATUS_BADGE_COMPACT_CLASS : FTC_STATUS_BADGE_DEFAULT_CLASS;
}
