import type { MutableRefObject } from "react";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

export const DM_BOOKING_CARD_REQUEST_ID_ATTR = "data-dm-booking-request-id";

export const DM_BOOKING_CARD_EXPAND_PANEL_ATTR = "data-dm-booking-card-expand-panel";

export const DM_BOOKING_NOTES_EXPAND_PANEL_ATTR = "data-dm-booking-notes-expand-panel";

export const DM_BOOKING_NOTES_TOGGLE_ATTR = "data-dm-booking-notes-toggle";

export const DM_CONVERSATION_HEADER_ATTR = "data-dm-conversation-header";

/** Visual gap between the conversation header and the expanded card top. */
const DM_BOOKING_CARD_HEADER_GAP_PX = 8;

/** Visual gap between revealed notes controls and the DM scroller bottom. */
const DM_BOOKING_NOTES_REVEAL_GAP_PX = 8;

const DM_BOOKING_CARD_ANCHOR_WAIT_MAX_FRAMES = 24;

const DM_BOOKING_CARD_EXPAND_TRANSITION_MS = 220;

const DM_BOOKING_NOTES_EXPAND_TRANSITION_MS = 220;

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

function resolveScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
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

/** Hold scrollTop steady while collapse layout changes run. */
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

/** Viewport Y coordinate where the expanded card top should sit (below the DM header). */
export function resolveDmBookingCardAlignTop(
  container: HTMLElement,
  gap: number = DM_BOOKING_CARD_HEADER_GAP_PX,
): number {
  const header = container.parentElement?.querySelector<HTMLElement>(
    `[${DM_CONVERSATION_HEADER_ATTR}]`,
  );

  if (header) {
    return header.getBoundingClientRect().bottom + gap;
  }

  const containerRect = container.getBoundingClientRect();
  const paddingTop = Number.parseFloat(getComputedStyle(container).paddingTop) || 0;

  return containerRect.top + paddingTop + gap;
}

export function scrollExpandedBookingCardBelowHeader(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  bookingRequestId: string,
  scrollBehavior: ScrollBehavior = resolveScrollBehavior(),
): void {
  if (cardAnchor.getAttribute(DM_BOOKING_CARD_REQUEST_ID_ATTR) !== bookingRequestId) {
    return;
  }

  const cardRect = cardAnchor.getBoundingClientRect();
  const desiredCardTop = resolveDmBookingCardAlignTop(container);
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const targetScrollTop = computeBookingCardAlignScrollTop(
    container.scrollTop,
    cardRect.top,
    desiredCardTop,
    maxScrollTop,
  );

  if (targetScrollTop === container.scrollTop) {
    return;
  }

  if (scrollBehavior === "auto") {
    container.scrollTop = targetScrollTop;
    clampDmMessageScrollTop(container);
    return;
  }

  container.scrollTo({
    top: targetScrollTop,
    behavior: scrollBehavior,
  });
}

/** Align card top to a viewport Y in the DM message scroller. */
export function computeBookingCardAlignScrollTop(
  scrollTop: number,
  cardTop: number,
  desiredCardTop: number,
  maxScrollTop: number,
): number {
  const delta = cardTop - desiredCardTop;

  if (Math.abs(delta) < 2) {
    return scrollTop;
  }

  const targetScrollTop = scrollTop + delta;

  return Math.max(0, Math.min(maxScrollTop, targetScrollTop));
}

/** Bottom edge to keep visible after Notes expand — card bottom includes action rows. */
export function resolveBookingNotesRevealBottom(cardAnchor: HTMLElement): number {
  const toggle = cardAnchor.querySelector<HTMLElement>(`[${DM_BOOKING_NOTES_TOGGLE_ATTR}]`);
  const cardBottom = cardAnchor.getBoundingClientRect().bottom;

  if (toggle) {
    return Math.max(toggle.getBoundingClientRect().bottom, cardBottom);
  }

  return cardBottom;
}

/** Minimum scrollTop delta to bring targetBottom above the scroller's visible bottom. */
export function computeMinimumScrollToRevealBottom(
  container: HTMLElement,
  targetBottom: number,
  paddingPx: number = DM_BOOKING_NOTES_REVEAL_GAP_PX,
): number | null {
  const visibleBottom = container.getBoundingClientRect().bottom - paddingPx;
  const overflow = targetBottom - visibleBottom;

  if (overflow <= 1) {
    return null;
  }

  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const targetScrollTop = Math.min(container.scrollTop + overflow, maxScrollTop);

  if (Math.abs(targetScrollTop - container.scrollTop) < 2) {
    return null;
  }

  return targetScrollTop;
}

function waitForBookingNotesExpandTransition(
  notesPanel: HTMLElement,
  onReady: () => void,
): () => void {
  if (prefersReducedMotion()) {
    requestAnimationFrame(onReady);
    return () => {};
  }

  let finished = false;

  const finish = () => {
    if (finished) {
      return;
    }

    finished = true;
    notesPanel.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(fallbackTimeoutId);
    onReady();
  };

  const handleTransitionEnd = (event: Event) => {
    const transitionEvent = event as TransitionEvent;

    if (transitionEvent.target !== notesPanel) {
      return;
    }

    if (transitionEvent.propertyName !== "height") {
      return;
    }

    finish();
  };

  notesPanel.addEventListener("transitionend", handleTransitionEnd);
  const fallbackTimeoutId = window.setTimeout(
    finish,
    DM_BOOKING_NOTES_EXPAND_TRANSITION_MS,
  );

  return () => {
    finished = true;
    notesPanel.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(fallbackTimeoutId);
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

function waitForExpandedBookingCardReady(
  getCardAnchor: () => HTMLElement | null,
  onReady: () => void,
): () => void {
  let cancelled = false;
  let frameId = 0;
  let attempts = 0;
  let cancelTransitionWait: (() => void) | null = null;

  const finish = () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    cancelTransitionWait?.();
    cancelTransitionWait = null;
  };

  const tick = () => {
    if (cancelled) {
      return;
    }

    const cardAnchor = getCardAnchor();

    if (!cardAnchor) {
      attempts += 1;

      if (attempts < DM_BOOKING_CARD_ANCHOR_WAIT_MAX_FRAMES) {
        frameId = requestAnimationFrame(tick);
      }

      return;
    }

    cancelTransitionWait = waitForBookingCardExpandTransition(cardAnchor, () => {
      if (cancelled) {
        return;
      }

      requestAnimationFrame(onReady);
    });
  };

  frameId = requestAnimationFrame(tick);

  return finish;
}

function waitForSmoothScrollAlign(
  container: HTMLElement,
  targetScrollTop: number,
  onComplete: () => void,
): () => void {
  let finished = false;

  const complete = () => {
    if (finished) {
      return;
    }

    finished = true;
    onComplete();
  };

  const cancel = () => {
    finished = true;
  };

  if ("onscrollend" in window) {
    container.addEventListener("scrollend", complete, { once: true });
    return cancel;
  }

  let lastScrollTop = container.scrollTop;
  let stableFrames = 0;
  let frameId = 0;

  const tick = () => {
    if (finished) {
      return;
    }

    const currentScrollTop = container.scrollTop;

    if (Math.abs(currentScrollTop - targetScrollTop) < 2) {
      complete();
      return;
    }

    if (currentScrollTop === lastScrollTop) {
      stableFrames += 1;

      if (stableFrames >= 3) {
        complete();
        return;
      }
    } else {
      stableFrames = 0;
      lastScrollTop = currentScrollTop;
    }

    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    finished = true;
    cancelAnimationFrame(frameId);
  };
}

/** Scroll once after the tapped card has fully expanded. */
export function scheduleExpandedBookingCardScrollAlign(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  bookingRequestId: string,
  pendingBookingRequestIdRef: MutableRefObject<string | null>,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
  let scrolled = false;
  let cancelReadyWait: (() => void) | null = null;
  let cancelScrollAlignWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelReadyWait?.();
    cancelReadyWait = null;
    cancelScrollAlignWait?.();
    cancelScrollAlignWait = null;
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

    const scrollBehavior = resolveScrollBehavior();
    const cardRect = cardAnchor.getBoundingClientRect();
    const desiredCardTop = resolveDmBookingCardAlignTop(container);
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetScrollTop = computeBookingCardAlignScrollTop(
      container.scrollTop,
      cardRect.top,
      desiredCardTop,
      maxScrollTop,
    );

    if (targetScrollTop === container.scrollTop) {
      scrolled = true;
      finish();
      return;
    }

    scrollExpandedBookingCardBelowHeader(
      container,
      cardAnchor,
      bookingRequestId,
      scrollBehavior,
    );
    scrolled = true;

    if (scrollBehavior === "smooth") {
      cancelScrollAlignWait = waitForSmoothScrollAlign(
        container,
        targetScrollTop,
        finish,
      );
      return;
    }

    finish();
  };

  cancelReadyWait = waitForExpandedBookingCardReady(getCardAnchor, runScroll);

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
  let cancelReadyWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelReadyWait?.();
    cancelReadyWait = null;
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

  cancelReadyWait = waitForExpandedBookingCardReady(getCardAnchor, runRestore);

  return finish;
}

/** After Notes expand, scroll the minimum amount to keep controls above the scroller bottom. */
export function scheduleBookingCardNotesRevealScroll(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  bookingRequestId: string,
  pendingBookingNotesScrollIdRef: MutableRefObject<string | null>,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
  let cancelTransitionWait: (() => void) | null = null;
  let cancelScrollAlignWait: (() => void) | null = null;

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelTransitionWait?.();
    cancelTransitionWait = null;
    cancelScrollAlignWait?.();
    cancelScrollAlignWait = null;
    onComplete?.();
  };

  const runScroll = () => {
    if (cancelled || pendingBookingNotesScrollIdRef.current !== bookingRequestId) {
      finish();
      return;
    }

    const cardAnchor = getCardAnchor();

    if (!cardAnchor) {
      finish();
      return;
    }

    const targetBottom = resolveBookingNotesRevealBottom(cardAnchor);
    const targetScrollTop = computeMinimumScrollToRevealBottom(container, targetBottom);

    if (targetScrollTop === null) {
      finish();
      return;
    }

    const scrollBehavior = resolveScrollBehavior();

    if (scrollBehavior === "auto") {
      container.scrollTop = targetScrollTop;
      clampDmMessageScrollTop(container);
      finish();
      return;
    }

    container.scrollTo({
      top: targetScrollTop,
      behavior: scrollBehavior,
    });
    cancelScrollAlignWait = waitForSmoothScrollAlign(container, targetScrollTop, finish);
  };

  const cardAnchor = getCardAnchor();

  if (!cardAnchor) {
    finish();
    return finish;
  }

  const notesPanel = cardAnchor.querySelector<HTMLElement>(
    `[${DM_BOOKING_NOTES_EXPAND_PANEL_ATTR}]`,
  );

  if (!notesPanel) {
    requestAnimationFrame(runScroll);
    return finish;
  }

  cancelTransitionWait = waitForBookingNotesExpandTransition(notesPanel, () => {
    if (cancelled) {
      return;
    }

    requestAnimationFrame(runScroll);
  });

  return finish;
}
