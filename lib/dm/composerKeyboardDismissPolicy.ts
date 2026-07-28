/**
 * Mobile DM keyboard dismiss policy.
 *
 * Platform facts (iOS Safari / installed PWA, 2026):
 * - Instagram's interactive keyboard dismiss uses native UIScrollView.keyboardDismissMode;
 *   that API is not exposed to JavaScript in Safari or WKWebView-hosted web apps.
 * - The Virtual Keyboard API is Chromium-only and does not provide finger tracking.
 * - When an input is focused, WebKit dismisses the software keyboard as soon as a
 *   scrollable ancestor begins native scrolling — often on the first touchmove,
 *   regardless of any blur() threshold the app sets.
 *
 * FTC therefore intercepts native scroll on the message list while the composer
 * is focused, applies scrollTop manually, and only calls blur() after a deliberate
 * downward pull while already pinned to the newest messages.
 */

import { CHAT_NEAR_BOTTOM_THRESHOLD_PX, getChatMaxScrollTop } from "@/lib/useChatScroll";

/** Downward pull at the newest-message edge, as a fraction of visible viewport height. */
export const COMPOSER_KEYBOARD_DISMISS_AT_BOTTOM_VIEWPORT_RATIO = 0.18;

/** Vertical travel must exceed horizontal travel by this ratio to count as dismiss intent. */
export const COMPOSER_KEYBOARD_DISMISS_VERTICAL_DOMINANCE_RATIO = 1.25;

export function isPinnedToNewestMessages(container: HTMLElement): boolean {
  const maxScrollTop = getChatMaxScrollTop(container);

  return maxScrollTop - container.scrollTop <= CHAT_NEAR_BOTTOM_THRESHOLD_PX;
}

export function computeManualMessageListScrollTop(
  startScrollTop: number,
  startY: number,
  currentY: number,
  maxScrollTop: number,
): number {
  const nextScrollTop = startScrollTop + (currentY - startY);

  return Math.max(0, Math.min(maxScrollTop, nextScrollTop));
}

export function isDownwardDismissIntent(deltaX: number, deltaY: number): boolean {
  if (deltaY <= 0) {
    return false;
  }

  const verticalTravel = Math.abs(deltaY);
  const horizontalTravel = Math.abs(deltaX);

  if (horizontalTravel === 0) {
    return true;
  }

  return verticalTravel / horizontalTravel >= COMPOSER_KEYBOARD_DISMISS_VERTICAL_DOMINANCE_RATIO;
}

export function getComposerKeyboardDismissThresholdPx(visibleViewportHeight: number): number {
  return visibleViewportHeight * COMPOSER_KEYBOARD_DISMISS_AT_BOTTOM_VIEWPORT_RATIO;
}

export function shouldDismissComposerKeyboardAtBottom({
  pinnedToNewest,
  downwardDragAtBottomPx,
  visibleViewportHeight,
  deltaX,
  deltaY,
}: {
  pinnedToNewest: boolean;
  downwardDragAtBottomPx: number;
  visibleViewportHeight: number;
  deltaX: number;
  deltaY: number;
}): boolean {
  if (!pinnedToNewest || !isDownwardDismissIntent(deltaX, deltaY)) {
    return false;
  }

  return (
    downwardDragAtBottomPx >= getComposerKeyboardDismissThresholdPx(visibleViewportHeight)
  );
}

export function nextDownwardDragAtBottomPx(
  currentDownwardDragAtBottomPx: number,
  pinnedToNewest: boolean,
  deltaY: number,
  previousY: number,
  currentY: number,
): number {
  if (!pinnedToNewest || currentY <= previousY) {
    return 0;
  }

  return currentDownwardDragAtBottomPx + (currentY - previousY);
}
