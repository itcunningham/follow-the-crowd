import type { MutableRefObject } from "react";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

export const DM_BOOKING_CARD_REQUEST_ID_ATTR = "data-dm-booking-request-id";

export const DM_BOOKING_CARD_EXPAND_PANEL_ATTR = "data-dm-booking-card-expand-panel";

/** Visual gap between the scroll container top and the expanded card. */
const DM_BOOKING_CARD_HEADER_GAP_PX = 8;

const DM_BOOKING_CARD_LAYOUT_STABLE_MAX_FRAMES = 24;

const DM_BOOKING_CARD_EXPAND_TRANSITION_MS = 220;

export type BookingCardScrollCapture = {
  scrollTop: number;
  anchorTop: number;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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

/** Hold scrollTop steady while flex-col-reverse layout changes would snap to latest messages. */
export function lockDmMessageScrollTop(
  container: HTMLElement,
  lockedScrollTop: number,
): () => void {
  let active = true;

  const enforce = () => {
    if (!active) {
      return;
    }

    if (container.scrollTop !== lockedScrollTop) {
      container.scrollTop = lockedScrollTop;
    }
  };

  enforce();
  container.addEventListener("scroll", enforce);

  let frameId = 0;

  const loop = () => {
    enforce();

    if (active) {
      frameId = requestAnimationFrame(loop);
    }
  };

  frameId = requestAnimationFrame(loop);

  return () => {
    active = false;
    container.removeEventListener("scroll", enforce);
    cancelAnimationFrame(frameId);
  };
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
    behavior: "auto",
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

function waitForBookingCardExpandTransition(
  cardAnchor: HTMLElement,
  onReady: () => void,
): () => void {
  if (prefersReducedMotion()) {
    requestAnimationFrame(onReady);
    return () => {};
  }

  const panel = cardAnchor.querySelector<HTMLElement>(
    `[${DM_BOOKING_CARD_EXPAND_PANEL_ATTR}]`,
  );

  if (!panel) {
    requestAnimationFrame(onReady);
    return () => {};
  }

  let finished = false;

  const finish = () => {
    if (finished) {
      return;
    }

    finished = true;
    panel.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(fallbackTimeoutId);
    onReady();
  };

  const handleTransitionEnd = (event: Event) => {
    const transitionEvent = event as TransitionEvent;

    if (transitionEvent.target !== panel) {
      return;
    }

    if (transitionEvent.propertyName !== "grid-template-rows") {
      return;
    }

    finish();
  };

  panel.addEventListener("transitionend", handleTransitionEnd);
  const fallbackTimeoutId = window.setTimeout(
    finish,
    DM_BOOKING_CARD_EXPAND_TRANSITION_MS,
  );

  return () => {
    finished = true;
    panel.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(fallbackTimeoutId);
  };
}

function waitForBookingCardExpandLayout(
  getCardAnchor: () => HTMLElement | null,
  onReady: () => void,
): () => void {
  let cancelled = false;
  let cancelStableWait: (() => void) | null = null;
  let cancelTransitionWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelStableWait?.();
    cancelStableWait = null;
    cancelTransitionWait?.();
    cancelTransitionWait = null;
  };

  cancelStableWait = waitForBookingCardLayoutStable(() => {
    if (cancelled) {
      return null;
    }

    return getCardAnchor();
  }, () => {
    if (cancelled) {
      return;
    }

    const cardAnchor = getCardAnchor();

    if (!cardAnchor) {
      onReady();
      finish();
      return;
    }

    cancelTransitionWait = waitForBookingCardExpandTransition(cardAnchor, () => {
      if (!cancelled) {
        onReady();
      }

      finish();
    });
  });

  return finish;
}

/** Scroll once after the tapped card's expanded layout + transition have finished. */
export function scheduleExpandedBookingCardScrollAlign(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  bookingRequestId: string,
  pendingBookingRequestIdRef: MutableRefObject<string | null>,
  lockedScrollTop: number,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
  let scrolled = false;
  let unlockScroll: (() => void) | null = lockDmMessageScrollTop(container, lockedScrollTop);
  let cancelLayoutWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelLayoutWait?.();
    cancelLayoutWait = null;
    unlockScroll?.();
    unlockScroll = null;
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

    unlockScroll?.();
    unlockScroll = null;
    scrollExpandedBookingCardBelowHeader(container, cardAnchor, bookingRequestId);
    scrolled = true;
    finish();
  };

  cancelLayoutWait = waitForBookingCardExpandLayout(getCardAnchor, runScroll);

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
  let unlockScroll: (() => void) | null = lockDmMessageScrollTop(
    container,
    capture?.scrollTop ?? container.scrollTop,
  );
  let cancelLayoutWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelLayoutWait?.();
    cancelLayoutWait = null;
    unlockScroll?.();
    unlockScroll = null;
    onComplete?.();
  };

  const runRestore = () => {
    if (cancelled) {
      finish();
      return;
    }

    const cardAnchor = getCardAnchor();

    unlockScroll?.();
    unlockScroll = null;

    if (cardAnchor && capture) {
      restoreBookingCardScrollPosition(container, cardAnchor, capture);
    } else {
      clampDmMessageScrollTop(container);
    }

    finish();
  };

  cancelLayoutWait = waitForBookingCardExpandLayout(getCardAnchor, runRestore);

  return finish;
}
