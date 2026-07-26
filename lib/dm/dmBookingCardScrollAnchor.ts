import { CHAT_MESSAGE_ID_ATTR } from "@/lib/useChatScroll";

export const DM_BOOKING_CARD_ANCHOR_ATTR = "data-dm-booking-card-anchor";

/** Matches BookingCardAnimatedExpand transition duration. */
export const DM_BOOKING_CARD_EXPAND_ANIMATION_MS = 200;

const DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX = 8;

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

export function clampDmMessageScrollTop(container: HTMLElement): void {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

  if (container.scrollTop > maxScrollTop) {
    container.scrollTop = maxScrollTop;
  }

  if (container.scrollTop < 0) {
    container.scrollTop = 0;
  }
}

function scrollBookingCardTopIntoView(container: HTMLElement, messageId: string): void {
  const cardAnchor = findDmBookingCardAnchor(container, messageId);

  if (!cardAnchor) {
    return;
  }

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

/** One smooth scroll after the expand animation completes. No artificial height is added. */
export function scheduleDmBookingCardExpandScroll(
  container: HTMLElement,
  messageId: string,
): () => void {
  let cancelled = false;

  const timeoutId = window.setTimeout(() => {
    if (cancelled) {
      return;
    }

    scrollBookingCardTopIntoView(container, messageId);
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
