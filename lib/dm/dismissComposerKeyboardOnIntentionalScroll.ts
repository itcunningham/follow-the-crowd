"use client";

import { useEffect, type RefObject } from "react";
import { syncMobileSoftwareKeyboardDocumentState } from "@/lib/navigation/mobileSoftwareKeyboard";

/** Minimum finger travel before treating a gesture as intentional scroll (not a tap). */
export const COMPOSER_KEYBOARD_DISMISS_SCROLL_THRESHOLD_PX = 10;

const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";

function isMobileChatViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches;
}

function isComposerInputFocused(input: HTMLInputElement | null): boolean {
  return input !== null && document.activeElement === input;
}

/**
 * Dismiss the software keyboard when the user intentionally scrolls the message list
 * while the composer input is focused. Mobile only — desktop keeps existing behaviour.
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

    let touchStartY: number | null = null;
    let dismissedForGesture = false;

    const dismissComposerKeyboard = () => {
      const input = composerInputRef.current;

      if (!input || !isComposerInputFocused(input)) {
        return;
      }

      input.blur();
      syncMobileSoftwareKeyboardDocumentState();
    };

    const resetTouchGesture = () => {
      touchStartY = null;
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

      touchStartY = event.touches[0].clientY;
      dismissedForGesture = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (
        dismissedForGesture ||
        touchStartY === null ||
        event.touches.length !== 1 ||
        !isComposerInputFocused(composerInputRef.current)
      ) {
        return;
      }

      const deltaY = Math.abs(event.touches[0].clientY - touchStartY);

      if (deltaY >= COMPOSER_KEYBOARD_DISMISS_SCROLL_THRESHOLD_PX) {
        dismissedForGesture = true;
        touchStartY = null;
        dismissComposerKeyboard();
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
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
