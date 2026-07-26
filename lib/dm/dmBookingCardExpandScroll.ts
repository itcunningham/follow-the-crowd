import type { MutableRefObject } from "react";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

export const DM_BOOKING_CARD_REQUEST_ID_ATTR = "data-dm-booking-request-id";

/** Visual gap between the scroll container top and the expanded card. */
const DM_BOOKING_CARD_HEADER_GAP_PX = 8;

const DM_BOOKING_CARD_LAYOUT_STABLE_MAX_FRAMES = 12;

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

export function scrollExpandedBookingCardBelowHeader(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  bookingRequestId: string,
): void {
  if (cardAnchor.getAttribute(DM_BOOKING_CARD_REQUEST_ID_ATTR) !== bookingRequestId) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const cardRect = cardAnchor.getBoundingClientRect();
  const delta = cardRect.top - containerRect.top - DM_BOOKING_CARD_HEADER_GAP_PX;

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

function waitForExpandedBookingCardLayout(
  getCardAnchor: () => HTMLElement | null,
  onReady: () => void,
): () => void {
  let cancelled = false;
  let frameId = 0;
  let attempts = 0;
  let lastHeight = -1;

  const tick = () => {
    if (cancelled) {
      return;
    }

    const cardAnchor = getCardAnchor();

    if (!cardAnchor) {
      attempts += 1;

      if (attempts < DM_BOOKING_CARD_LAYOUT_STABLE_MAX_FRAMES) {
        frameId = requestAnimationFrame(tick);
      }

      return;
    }

    const nextHeight = cardAnchor.getBoundingClientRect().height;

    if (nextHeight === lastHeight && lastHeight >= 0) {
      onReady();
      return;
    }

    lastHeight = nextHeight;
    attempts += 1;

    if (attempts < DM_BOOKING_CARD_LAYOUT_STABLE_MAX_FRAMES) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    onReady();
  };

  frameId = requestAnimationFrame(() => {
    frameId = requestAnimationFrame(tick);
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
  };
}

/** Scroll once after the tapped card's expanded layout has committed. */
export function scheduleExpandedBookingCardScrollAlign(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  bookingRequestId: string,
  pendingBookingRequestIdRef: MutableRefObject<string | null>,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
  let scrolled = false;
  let cancelLayoutWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelLayoutWait?.();
    cancelLayoutWait = null;
    onComplete?.();
  };

  const runScroll = () => {
    if (cancelled || scrolled || pendingBookingRequestIdRef.current !== bookingRequestId) {
      finish();
      return;
    }

    const cardAnchor = getCardAnchor();

    if (!cardAnchor) {
      finish();
      return;
    }

    scrollExpandedBookingCardBelowHeader(container, cardAnchor, bookingRequestId);
    scrolled = true;
    finish();
  };

  cancelLayoutWait = waitForExpandedBookingCardLayout(getCardAnchor, runScroll);

  return finish;
}

export function scheduleCollapsedBookingCardScrollClamp(
  container: HTMLElement,
): () => void {
  let cancelled = false;
  let frameId = 0;

  frameId = requestAnimationFrame(() => {
    frameId = requestAnimationFrame(() => {
      if (!cancelled) {
        clampDmMessageScrollTop(container);
      }
    });
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
  };
}
