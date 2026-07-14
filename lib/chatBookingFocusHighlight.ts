export const CHAT_BOOKING_FOCUS_HOLD_MS = 2000;
export const CHAT_BOOKING_FOCUS_FADE_MS = 1000;
export const CHAT_BOOKING_FOCUS_TOTAL_MS =
  CHAT_BOOKING_FOCUS_HOLD_MS + CHAT_BOOKING_FOCUS_FADE_MS;

export const CHAT_BOOKING_FOCUS_HIGHLIGHT_CLASS = "chat-booking-focus-highlight";

export function getChatBookingFocusHighlightClass(isFocused: boolean): string {
  return isFocused ? CHAT_BOOKING_FOCUS_HIGHLIGHT_CLASS : "";
}
