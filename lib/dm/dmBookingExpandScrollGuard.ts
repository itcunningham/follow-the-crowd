import type { MutableRefObject } from "react";

/** True while a booking card is expanding and its align scroll has not finished. */
export function isDmBookingCardExpandAlignActive(
  bookingCardExpandAlignGuardRef: MutableRefObject<string | null> | undefined,
): boolean {
  return Boolean(bookingCardExpandAlignGuardRef?.current);
}

export function isDmChatAutoScrollSuppressed(
  suppressAutoScrollRef: MutableRefObject<boolean> | undefined,
  bookingCardExpandAlignGuardRef: MutableRefObject<string | null> | undefined,
): boolean {
  return Boolean(suppressAutoScrollRef?.current) || isDmBookingCardExpandAlignActive(bookingCardExpandAlignGuardRef);
}
