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

export type BookingCardScrollDiagnostics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  distanceFromBottom: number;
  cardTop: number | null;
  cardBottom: number | null;
};

export function readBookingCardScrollDiagnostics(
  container: HTMLElement,
  cardAnchor: HTMLElement | null,
): BookingCardScrollDiagnostics {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const cardRect = cardAnchor?.getBoundingClientRect();

  return {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
    distanceFromBottom: maxScrollTop - container.scrollTop,
    cardTop: cardRect?.top ?? null,
    cardBottom: cardRect?.bottom ?? null,
  };
}

function isBookingCardCollapseTraceEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return (
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("ftc-booking-collapse-trace-enabled") === "1"
  );
}

export function traceBookingCardCollapseScroll(
  phase: string,
  container: HTMLElement,
  cardAnchor: HTMLElement | null,
  write?: { writer: string; beforeScrollTop: number; afterScrollTop: number },
): void {
  if (!isBookingCardCollapseTraceEnabled()) {
    return;
  }

  console.info("[ftc-booking-collapse-scroll]", phase, {
    ...readBookingCardScrollDiagnostics(container, cardAnchor),
    ...(write
      ? {
          writer: write.writer,
          beforeScrollTop: write.beforeScrollTop,
          afterScrollTop: write.afterScrollTop,
          scrollTopDelta: write.afterScrollTop - write.beforeScrollTop,
        }
      : {}),
  });
}

function writeDmMessageScrollTop(
  container: HTMLElement,
  scrollTop: number,
  writer: string,
  traceCollapseWrites: boolean,
  getCardAnchor?: () => HTMLElement | null,
): void {
  const beforeScrollTop = container.scrollTop;

  if (beforeScrollTop === scrollTop) {
    return;
  }

  container.scrollTop = scrollTop;

  if (traceCollapseWrites) {
    traceBookingCardCollapseScroll(`scroll-write:${writer}`, container, getCardAnchor?.() ?? null, {
      writer,
      beforeScrollTop,
      afterScrollTop: scrollTop,
    });
  }
}

function scrollDmMessageContainerTo(
  container: HTMLElement,
  scrollTop: number,
  behavior: ScrollBehavior,
  writer: string,
  traceCollapseWrites: boolean,
  getCardAnchor?: () => HTMLElement | null,
): void {
  const beforeScrollTop = container.scrollTop;

  if (beforeScrollTop === scrollTop) {
    return;
  }

  container.scrollTo({ top: scrollTop, behavior });

  if (traceCollapseWrites && behavior === "auto") {
    traceBookingCardCollapseScroll(`scroll-write:${writer}`, container, getCardAnchor?.() ?? null, {
      writer,
      beforeScrollTop,
      afterScrollTop: container.scrollTop,
    });
  }
}

/** Safari keeps smooth scrollTo animations alive after our waiter is cancelled. */
function abortInFlightContainerScroll(container: HTMLElement): void {
  container.scrollTo({ top: container.scrollTop, behavior: "auto" });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function resolveScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function clampDmMessageScrollTop(
  container: HTMLElement,
  writer = "clampDmMessageScrollTop",
  traceCollapseWrites = false,
  getCardAnchor?: () => HTMLElement | null,
): void {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

  if (container.scrollTop > maxScrollTop) {
    writeDmMessageScrollTop(container, maxScrollTop, writer, traceCollapseWrites, getCardAnchor);
  }

  if (container.scrollTop < 0) {
    writeDmMessageScrollTop(container, 0, writer, traceCollapseWrites, getCardAnchor);
  }
}

/** scrollTop after the scroller shrinks while the card accordion collapses. */
export function computeScrollTopAfterShrink(
  scrollTop: number,
  previousScrollHeight: number,
  currentScrollHeight: number,
  maxScrollTop: number,
): number {
  const shrink = previousScrollHeight - currentScrollHeight;

  if (shrink <= 0) {
    return scrollTop;
  }

  return Math.max(0, Math.min(maxScrollTop, scrollTop - shrink));
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

function scrollExpandedBookingCardBelowHeader(
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
    writeDmMessageScrollTop(container, targetScrollTop, "expand-align:auto", false);
    clampDmMessageScrollTop(container);
    return;
  }

  scrollDmMessageContainerTo(
    container,
    targetScrollTop,
    scrollBehavior,
    "expand-align:smooth",
    false,
  );
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

function waitForBookingCardTransitionEnd(
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

/** Keep scrollTop in sync with accordion height changes during the grid transition. */
function compensateScrollDuringPanelTransition(
  container: HTMLElement,
  traceCollapseWrites: boolean,
  getCardAnchor?: () => HTMLElement | null,
): () => void {
  if (prefersReducedMotion()) {
    return () => {};
  }

  let active = true;
  let frameId = 0;
  let previousScrollHeight = container.scrollHeight;

  const tick = () => {
    if (!active) {
      return;
    }

    const currentScrollHeight = container.scrollHeight;
    const maxScrollTop = Math.max(0, currentScrollHeight - container.clientHeight);
    const nextScrollTop = computeScrollTopAfterShrink(
      container.scrollTop,
      previousScrollHeight,
      currentScrollHeight,
      maxScrollTop,
    );

    writeDmMessageScrollTop(
      container,
      nextScrollTop,
      "collapse:height-compensation",
      traceCollapseWrites,
      getCardAnchor,
    );

    previousScrollHeight = currentScrollHeight;
    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    active = false;
    cancelAnimationFrame(frameId);
  };
}

export type BookingCardExpandScrollDirection = "expand" | "collapse";

/** One scroll coordinator for booking-card accordion expand and collapse. */
export function scheduleBookingCardExpandScrollTransition(
  container: HTMLElement,
  getCardAnchor: () => HTMLElement | null,
  bookingRequestId: string,
  direction: BookingCardExpandScrollDirection,
  pendingBookingRequestIdRef: MutableRefObject<string | null>,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
  let cancelTransitionWait: (() => void) | null = null;
  let cancelScrollAlignWait: (() => void) | null = null;
  let stopScrollCompensation: (() => void) | null = null;
  let pendingSmoothAlign = false;
  const traceCollapseWrites = direction === "collapse";

  const finish = () => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    cancelTransitionWait?.();
    cancelTransitionWait = null;
    cancelScrollAlignWait?.();
    cancelScrollAlignWait = null;
    stopScrollCompensation?.();
    stopScrollCompensation = null;

    if (pendingSmoothAlign) {
      pendingSmoothAlign = false;
      abortInFlightContainerScroll(container);
    }

    onComplete?.();
  };

  const settleAfterTransition = () => {
    stopScrollCompensation?.();
    stopScrollCompensation = null;

    if (cancelled) {
      finish();
      return;
    }

    const cardAnchor = getCardAnchor();

    if (direction === "collapse") {
      traceBookingCardCollapseScroll("collapse-settled", container, cardAnchor);
      finish();
      return;
    }

    if (pendingBookingRequestIdRef.current !== bookingRequestId) {
      finish();
      return;
    }

    if (!cardAnchor) {
      finish();
      return;
    }

    traceBookingCardCollapseScroll("expand-settled:before-align", container, cardAnchor);

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
      traceBookingCardCollapseScroll("expand-settled:aligned", container, cardAnchor);
      finish();
      return;
    }

    scrollExpandedBookingCardBelowHeader(
      container,
      cardAnchor,
      bookingRequestId,
      scrollBehavior,
    );

    if (scrollBehavior === "smooth") {
      pendingSmoothAlign = true;
      cancelScrollAlignWait = waitForSmoothScrollAlign(
        container,
        targetScrollTop,
        () => {
          pendingSmoothAlign = false;
          traceBookingCardCollapseScroll("expand-settled:aligned", container, cardAnchor);
          finish();
        },
      );
      return;
    }

    traceBookingCardCollapseScroll("expand-settled:aligned", container, cardAnchor);
    finish();
  };

  const beginScrollCompensation = () => {
    if (cancelled || direction !== "collapse") {
      return;
    }

    stopScrollCompensation = compensateScrollDuringPanelTransition(
      container,
      traceCollapseWrites,
      getCardAnchor,
    );
  };

  cancelTransitionWait = waitForBookingCardTransitionEnd(
    getCardAnchor,
    settleAfterTransition,
  );
  requestAnimationFrame(beginScrollCompensation);

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
