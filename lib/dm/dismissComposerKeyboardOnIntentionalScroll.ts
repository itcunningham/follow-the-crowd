"use client";

import { useEffect, type RefObject } from "react";
import { syncMobileSoftwareKeyboardDocumentState } from "@/lib/navigation/mobileSoftwareKeyboard";

/**
 * Downward finger travel required before the keyboard may close.
 * Chosen to approximate Instagram-style deliberate dismiss on iPhone (~390px wide).
 */
export const COMPOSER_KEYBOARD_DISMISS_THRESHOLD_PX = 120;

/** Vertical movement must exceed horizontal movement by this ratio. */
export const COMPOSER_KEYBOARD_DISMISS_VERTICAL_DOMINANCE_RATIO = 1.25;

/** Upward reversal from peak downward travel cancels an in-progress dismiss gesture. */
export const COMPOSER_KEYBOARD_DISMISS_REVERSAL_CANCEL_PX = 24;

/** Finger must reach this fraction of the visible viewport height before dismiss. */
export const COMPOSER_KEYBOARD_DISMISS_VIEWPORT_LOWER_RATIO = 0.55;

const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";

type ActiveGesture = {
  startX: number;
  startY: number;
  maxDownwardDeltaY: number;
};

function isMobileChatViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches;
}

function isComposerInputFocused(input: HTMLInputElement | null): boolean {
  return input !== null && document.activeElement === input;
}

function getVisibleViewportLowerBound(): number {
  const viewport = window.visualViewport;

  if (!viewport) {
    return window.innerHeight * COMPOSER_KEYBOARD_DISMISS_VIEWPORT_LOWER_RATIO;
  }

  return viewport.offsetTop + viewport.height * COMPOSER_KEYBOARD_DISMISS_VIEWPORT_LOWER_RATIO;
}

function isDownwardDismissIntent(deltaX: number, deltaY: number): boolean {
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

function preserveScrollPositionDuringKeyboardDismiss(
  container: HTMLElement,
  dismiss: () => void,
): void {
  const scrollTop = container.scrollTop;

  dismiss();

  const restoreScrollTop = () => {
    if (container.scrollTop !== scrollTop) {
      container.scrollTop = scrollTop;
    }
  };

  requestAnimationFrame(restoreScrollTop);
  requestAnimationFrame(() => {
    requestAnimationFrame(restoreScrollTop);
  });
  window.visualViewport?.addEventListener("resize", restoreScrollTop, { once: true });
}

/**
 * Threshold-based keyboard dismiss for mobile DM chat.
 *
 * True UIScrollView-style interactive keyboard tracking is not exposed to web pages
 * on iOS Safari or Android Chrome — the OS keyboard cannot follow the finger.
 * This hook implements a restrained fallback: no blur on touchstart, no dismiss on
 * taps or small movement, no dismiss on upward drag or ordinary message scrolling.
 */
export function useDismissComposerKeyboardOnIntentionalScroll(
  scrollRef: RefObject<HTMLElement | null>,
  composerInputRef: RefObject<HTMLInputElement | null>,
): void {
  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    let activeGesture: ActiveGesture | null = null;
    let dismissedForGesture = false;

    const dismissComposerKeyboard = () => {
      const input = composerInputRef.current;

      if (!input || !isComposerInputFocused(input)) {
        return;
      }

      preserveScrollPositionDuringKeyboardDismiss(container, () => {
        input.blur();
        syncMobileSoftwareKeyboardDocumentState();
      });
    };

    const resetTouchGesture = () => {
      activeGesture = null;
      dismissedForGesture = false;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!isMobileChatViewport() || !isComposerInputFocused(composerInputRef.current)) {
        resetTouchGesture();
        return;
      }

      if (event.touches.length !== 1) {
        resetTouchGesture();
        return;
      }

      const touch = event.touches[0];
      activeGesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        maxDownwardDeltaY: 0,
      };
      dismissedForGesture = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (
        dismissedForGesture ||
        activeGesture === null ||
        event.touches.length !== 1 ||
        !isComposerInputFocused(composerInputRef.current)
      ) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - activeGesture.startX;
      const deltaY = touch.clientY - activeGesture.startY;

      if (deltaY < 0) {
        return;
      }

      if (!isDownwardDismissIntent(deltaX, deltaY)) {
        return;
      }

      if (deltaY > activeGesture.maxDownwardDeltaY) {
        activeGesture.maxDownwardDeltaY = deltaY;
      } else if (
        activeGesture.maxDownwardDeltaY - deltaY >= COMPOSER_KEYBOARD_DISMISS_REVERSAL_CANCEL_PX
      ) {
        resetTouchGesture();
        return;
      }

      const peakDownwardDeltaY = activeGesture.maxDownwardDeltaY;

      if (peakDownwardDeltaY < COMPOSER_KEYBOARD_DISMISS_THRESHOLD_PX) {
        event.preventDefault();
        return;
      }

      if (touch.clientY < getVisibleViewportLowerBound()) {
        event.preventDefault();
        return;
      }

      dismissedForGesture = true;
      activeGesture = null;
      dismissComposerKeyboard();
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", resetTouchGesture, { passive: true });
    container.addEventListener("touchcancel", resetTouchGesture, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", resetTouchGesture);
      container.removeEventListener("touchcancel", resetTouchGesture);
    };
  }, [composerInputRef, scrollRef]);
}
