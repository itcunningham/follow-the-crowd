/**
 * Gigs workspace sub-nav pending count — compact badge that grows with count through 99+.
 *
 * Sized at 0.75rem (12px), a 25% reduction from the original 1rem: on the selected
 * pill this reads as an indicator dot carrying a number, and at 16px it drew more
 * attention than the tab label itself. Font and horizontal padding are scaled with
 * the box rather than left at their old values, so a single digit still fits inside
 * `min-w` and the badge stays a true circle instead of becoming an oval. Centring is
 * handled by the flex `items-center justify-center` on this element plus the parent
 * pill's own centring — no hard-coded offsets — so it stays centred regardless of
 * label length or localisation.
 */
export const WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS =
  "inline-flex h-3 min-w-3 shrink-0 items-center justify-center rounded-full px-[3px] text-[9px] font-bold leading-none tabular-nums";
