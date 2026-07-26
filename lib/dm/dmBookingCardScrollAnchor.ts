import { CHAT_MESSAGE_ID_ATTR } from "@/lib/useChatScroll";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

export const DM_BOOKING_CARD_SCROLL_SPACER_ATTR = "data-dm-booking-card-scroll-spacer";

/** Matches BookingCardAnimatedExpand transition duration. */
export const DM_BOOKING_CARD_EXPAND_ANIMATION_MS = 200;

const DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX = 8;

const DM_BOOKING_CARD_SCROLL_ALIGN_MAX_ITERATIONS = 6;

const DM_BOOKING_CARD_COLLAPSE_STABLE_FRAMES = 2;

export type DmBookingCardScrollSpacerControls = {
  getHeight: () => number;
  setHeight: (heightPx: number) => void;
};

export type DmBookingCardExpandScrollOptions = {
  spacer: DmBookingCardScrollSpacerControls;
  topOffsetPx?: number;
};

export type DmBookingCardCollapseScrollOptions = {
  spacer: DmBookingCardScrollSpacerControls;
  mutate: () => void;
};

function resolveScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") {
    return "auto";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function findDmBookingCardAnchor(
  container: HTMLElement,
  messageId: string,
): HTMLElement | null {
  const messageElement = container.querySelector<HTMLElement>(
    `[${CHAT_MESSAGE_ID_ATTR}="${CSS.escape(messageId)}"]`,
  );

  if (!messageElement) {
    return null;
  }

  return (
    messageElement.querySelector<HTMLElement>(`[${DM_BOOKING_CARD_ANCHOR_ATTR}]`) ??
    messageElement
  );
}

function computeScrollDelta(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  topOffsetPx: number,
): number {
  const containerRect = container.getBoundingClientRect();
  const cardRect = cardAnchor.getBoundingClientRect();

  return cardRect.top - containerRect.top - topOffsetPx;
}

function computeRequiredBottomSpacerPx(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  topOffsetPx: number,
  currentSpacerPx: number,
): number {
  const delta = computeScrollDelta(container, cardAnchor, topOffsetPx);
  const targetScrollTop = container.scrollTop + delta;
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  let requiredSpacer = currentSpacerPx;

  if (targetScrollTop > maxScrollTop + 1) {
    requiredSpacer = Math.max(requiredSpacer, currentSpacerPx + (targetScrollTop - maxScrollTop));
  }

  if (targetScrollTop < -1) {
    requiredSpacer = Math.max(requiredSpacer, currentSpacerPx + -targetScrollTop);
  }

  return Math.ceil(requiredSpacer);
}

function applyDmBookingCardScrollAlign(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  topOffsetPx: number,
  behavior: ScrollBehavior,
): boolean {
  const delta = computeScrollDelta(container, cardAnchor, topOffsetPx);

  if (Math.abs(delta) < 2) {
    return true;
  }

  const targetScrollTop = container.scrollTop + delta;
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));

  if (Math.abs(clampedScrollTop - targetScrollTop) > 2) {
    return false;
  }

  if (Math.abs(clampedScrollTop - container.scrollTop) >= 1) {
    container.scrollTo({ top: clampedScrollTop, behavior });
  }

  return Math.abs(computeScrollDelta(container, cardAnchor, topOffsetPx)) < 4;
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

function preserveDmBookingCardVisualAnchor(
  container: HTMLElement,
  messageId: string,
  beforeTop: number,
): void {
  const afterAnchor = findDmBookingCardAnchor(container, messageId);

  if (!afterAnchor) {
    return;
  }

  const afterTop = afterAnchor.getBoundingClientRect().top;
  const delta = afterTop - beforeTop;

  if (delta !== 0) {
    container.scrollTop += delta;
  }
}

function removeDmBookingExpandSpacerSafely(
  container: HTMLElement,
  spacer: DmBookingCardScrollSpacerControls,
): void {
  const spacerHeight = spacer.getHeight();

  if (spacerHeight <= 0) {
    clampDmMessageScrollTop(container);
    return;
  }

  spacer.setHeight(0);

  requestAnimationFrame(() => {
    clampDmMessageScrollTop(container);
  });
}

export function scrollDmBookingCardTopIntoView(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  options?: { offsetPx?: number; behavior?: ScrollBehavior },
): boolean {
  const topOffsetPx = options?.offsetPx ?? DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX;
  const behavior = options?.behavior ?? resolveScrollBehavior();

  return applyDmBookingCardScrollAlign(container, cardAnchor, topOffsetPx, behavior);
}

export function scheduleDmBookingCardCollapseScrollAnchor(
  container: HTMLElement,
  messageId: string,
  options: DmBookingCardCollapseScrollOptions,
): () => void {
  let cancelled = false;
  let finished = false;
  let observer: ResizeObserver | null = null;
  let pendingFrameId = 0;
  let stableFrames = 0;
  let lastObservedHeight = 0;

  const beforeAnchor = findDmBookingCardAnchor(container, messageId);
  const beforeTop = beforeAnchor?.getBoundingClientRect().top;

  const finish = () => {
    if (cancelled || finished) {
      return;
    }

    finished = true;
    observer?.disconnect();
    observer = null;

    if (beforeTop !== undefined) {
      preserveDmBookingCardVisualAnchor(container, messageId, beforeTop);
    }

    removeDmBookingExpandSpacerSafely(container, options.spacer);
  };

  options.mutate();

  if (beforeTop === undefined) {
    removeDmBookingExpandSpacerSafely(container, options.spacer);
    return () => {
      cancelled = true;
    };
  }

  const observeAnchor = () => {
    const anchor = findDmBookingCardAnchor(container, messageId);

    if (!anchor || cancelled || finished) {
      if (!finished && !cancelled) {
        finish();
      }
      return;
    }

    lastObservedHeight = anchor.getBoundingClientRect().height;
    stableFrames = 0;

    observer?.disconnect();
    observer = new ResizeObserver(() => {
      if (cancelled || finished) {
        return;
      }

      const currentAnchor = findDmBookingCardAnchor(container, messageId);

      if (!currentAnchor) {
        finish();
        return;
      }

      const nextHeight = currentAnchor.getBoundingClientRect().height;

      if (Math.abs(nextHeight - lastObservedHeight) < 1) {
        stableFrames += 1;

        if (stableFrames >= DM_BOOKING_CARD_COLLAPSE_STABLE_FRAMES) {
          finish();
        }

        return;
      }

      lastObservedHeight = nextHeight;
      stableFrames = 0;
    });

    observer.observe(anchor);
  };

  pendingFrameId = requestAnimationFrame(() => {
    requestAnimationFrame(observeAnchor);
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(pendingFrameId);
    observer?.disconnect();
    observer = null;
  };
}

export function scheduleDmBookingCardExpandScroll(
  container: HTMLElement,
  messageId: string,
  options: DmBookingCardExpandScrollOptions,
): () => void {
  let cancelled = false;
  let aligned = false;
  let observer: ResizeObserver | null = null;
  let pendingFrameId = 0;
  let iteration = 0;
  const topOffsetPx = options.topOffsetPx ?? DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX;
  const behavior = resolveScrollBehavior();

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const attemptAlign = () => {
    if (cancelled || aligned) {
      return;
    }

    const cardAnchor = findDmBookingCardAnchor(container, messageId);

    if (!cardAnchor) {
      return;
    }

    iteration += 1;

    const currentSpacer = options.spacer.getHeight();
    const requiredSpacer = computeRequiredBottomSpacerPx(
      container,
      cardAnchor,
      topOffsetPx,
      currentSpacer,
    );

    if (requiredSpacer > currentSpacer) {
      options.spacer.setHeight(requiredSpacer);

      if (iteration < DM_BOOKING_CARD_SCROLL_ALIGN_MAX_ITERATIONS) {
        return;
      }
    }

    const didAlign = applyDmBookingCardScrollAlign(
      container,
      cardAnchor,
      topOffsetPx,
      iteration === 1 ? behavior : "auto",
    );

    if (didAlign || iteration >= DM_BOOKING_CARD_SCROLL_ALIGN_MAX_ITERATIONS) {
      aligned = true;
      cleanup();
    }
  };

  const queueAttempt = () => {
    cancelAnimationFrame(pendingFrameId);
    pendingFrameId = requestAnimationFrame(attemptAlign);
  };

  observer = new ResizeObserver(() => {
    if (!cancelled && !aligned) {
      queueAttempt();
    }
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      const cardAnchor = findDmBookingCardAnchor(container, messageId);

      if (cardAnchor) {
        observer?.observe(cardAnchor);
        observer?.observe(container);
      }

      queueAttempt();
    });
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(pendingFrameId);
    cleanup();
  };
}

export function resolveDmBookingCardScrollSpacerStyle(spacerPx: number): {
  paddingBottom?: number;
} {
  if (spacerPx <= 0) {
    return {};
  }

  return {
    paddingBottom: Math.max(DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX, spacerPx),
  };
}
