export const CHAT_BOOKING_FOCUS_HOLD_MS = 2000;
export const CHAT_BOOKING_FOCUS_FADE_MS = 1000;
export const CHAT_BOOKING_FOCUS_TOTAL_MS =
  CHAT_BOOKING_FOCUS_HOLD_MS + CHAT_BOOKING_FOCUS_FADE_MS;

export type BookingFocusPhase = "active" | "fading" | null;

export function getBookingFocusPhase(
  phasesByMessageId: Map<string, Exclude<BookingFocusPhase, null>>,
  messageId: string,
): BookingFocusPhase {
  return phasesByMessageId.get(messageId) ?? null;
}
