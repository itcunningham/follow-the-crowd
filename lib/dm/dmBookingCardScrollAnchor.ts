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

export function scrollDmBookingCardTopIntoView(
  container: HTMLElement,
  cardAnchor: HTMLElement,
  options?: { offsetPx?: number; behavior?: ScrollBehavior },
): void {
  const offsetPx = options?.offsetPx ?? DM_BOOKING_CARD_SCROLL_TOP_OFFSET_PX;
  const behavior = options?.behavior ?? resolveScrollBehavior();
  const containerRect = container.getBoundingClientRect();
  const cardRect = cardAnchor.getBoundingClientRect();
  const delta = cardRect.top - containerRect.top - offsetPx;

  if (Math.abs(delta) < 2) {
    return;
  }

  container.scrollTo({
    top: container.scrollTop + delta,
    behavior,
  });
}

export function preserveDmBookingCardScrollAnchor(
  container: HTMLElement,
  messageId: string,
  mutate: () => void,
  animationMs = DM_BOOKING_CARD_EXPAND_ANIMATION_MS,
): void {
  const beforeAnchor = findDmBookingCardAnchor(container, messageId);
  const beforeTop = beforeAnchor?.getBoundingClientRect().top;

  mutate();

  if (beforeTop === undefined) {
    return;
  }

  const adjust = () => {
    const afterAnchor = findDmBookingCardAnchor(container, messageId);

    if (!afterAnchor) {
      return;
    }

    const afterTop = afterAnchor.getBoundingClientRect().top;
    const delta = afterTop - beforeTop;

    if (delta !== 0) {
      container.scrollTop += delta;
    }
  };

  requestAnimationFrame(() => {
    adjust();
    requestAnimationFrame(adjust);
  });
  window.setTimeout(adjust, animationMs);
}

export function scheduleDmBookingCardExpandScroll(
  container: HTMLElement,
  messageId: string,
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const cardAnchor = findDmBookingCardAnchor(container, messageId);

      if (!cardAnchor) {
        return;
      }

      scrollDmBookingCardTopIntoView(container, cardAnchor);
    });
  });
}
