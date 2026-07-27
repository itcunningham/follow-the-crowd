import type { MutableRefObject } from "react";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

export const DM_BOOKING_CARD_REQUEST_ID_ATTR = "data-dm-booking-request-id";

/** Prevent booking-card height changes from becoming scroll anchors in flex-col-reverse DMs. */
export const DM_BOOKING_CARD_OVERFLOW_ANCHOR_CLASS = "[overflow-anchor:none]";

/** Visual gap between the scroll container top and the expanded card. */
const DM_BOOKING_CARD_HEADER_GAP_PX = 8;

const DM_BOOKING_CARD_LAYOUT_STABLE_MAX_FRAMES = 12;

export type BookingCardScrollCapture = {
  scrollTop: number;
  anchorTop: number;
};

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

export function captureBookingCardScrollPosition(
  container: HTMLElement,
  cardAnchor: HTMLElement,
): BookingCardScrollCapture {
  return {
    scrollTop: container.scrollTop,
    anchorTop: cardAnchor.getBoundingClientRect().top,
  };
}

export function restoreBookingCardScrollPosition(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  capture: BookingCardScrollCapture,
): void {
  const delta = cardAnchor.getBoundingClientRect().top - capture.anchorTop;

  if (delta !== 0) {
    container.scrollTop = capture.scrollTop + delta;
  }

  clampDmMessageScrollTop(container);
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

function waitForBookingCardLayoutStable(
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

  cancelLayoutWait = waitForBookingCardLayoutStable(getCardAnchor, runScroll);

  return finish;
}

/** After collapse, restore the card's visual position then clamp if needed. */
export function scheduleCollapsedBookingCardScrollRestore(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  capture: BookingCardScrollCapture | null,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
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

  const runRestore = () => {
    if (cancelled) {
      finish();
      return;
    }

    const cardAnchor = getCardAnchor();

    if (cardAnchor && capture) {
      restoreBookingCardScrollPosition(container, cardAnchor, capture);
    } else {
      clampDmMessageScrollTop(container);
    }

    finish();
  };

  cancelLayoutWait = waitForBookingCardLayoutStable(getCardAnchor, runRestore);

  return finish;
}
