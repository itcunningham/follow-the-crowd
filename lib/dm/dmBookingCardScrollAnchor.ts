import type { MutableRefObject } from "react";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

export const DM_BOOKING_CARD_REQUEST_ID_ATTR = "data-dm-booking-request-id";

/** Matches BookingCardAnimatedExpand transition duration. */
export const DM_BOOKING_CARD_EXPAND_ANIMATION_MS = 200;

const DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX = 8;

function resolveScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") {
    return "auto";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function clampDmMessageScrollTop(container: HTMLElement): void {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

  if (container.scrollTop > maxScrollTop) {
    container.scrollTop = maxScrollTop;
  }

  if (container.scrollTop < 0) {
    container.scrollTop = 0;
  }
}

export function scrollDmBookingCardTopIntoView(
  container: HTMLElement,
  cardAnchor: HTMLElement,
): void {
  const containerRect = container.getBoundingClientRect();
  const cardRect = cardAnchor.getBoundingClientRect();
  const delta = cardRect.top - containerRect.top - DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX;

  if (Math.abs(delta) < 2) {
    return;
  }

  const targetScrollTop = container.scrollTop + delta;
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));

  container.scrollTo({
    top: clampedScrollTop,
    behavior: resolveScrollBehavior(),
  });
}

/** One smooth scroll after the expand animation for the booking the user opened. */
export function scheduleDmBookingCardExpandScroll(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  bookingRequestId: string,
  pendingBookingRequestIdRef: MutableRefObject<string | null>,
): () => void {
  let cancelled = false;

  const timeoutId = window.setTimeout(() => {
    if (cancelled || pendingBookingRequestIdRef.current !== bookingRequestId) {
      return;
    }

    const cardAnchor = getCardAnchor();

    if (
      !cardAnchor ||
      cardAnchor.getAttribute(DM_BOOKING_CARD_REQUEST_ID_ATTR) !== bookingRequestId
    ) {
      return;
    }

    scrollDmBookingCardTopIntoView(container, cardAnchor);
  }, DM_BOOKING_CARD_EXPAND_ANIMATION_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
  };
}

/** Clamp scrollTop to valid content bounds after collapse animation completes. */
export function scheduleDmBookingCardCollapseClamp(container: HTMLElement): () => void {
  let cancelled = false;

  const timeoutId = window.setTimeout(() => {
    if (cancelled) {
      return;
    }

    clampDmMessageScrollTop(container);
  }, DM_BOOKING_CARD_EXPAND_ANIMATION_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
  };
}
