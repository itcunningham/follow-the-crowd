"use client";

import { useEffect, type RefObject } from "react";
import { syncMobileSoftwareKeyboardDocumentState } from "@/lib/navigation/mobileSoftwareKeyboard";

/** Minimum downward finger travel before we consider keyboard-dismiss intent. */
export const COMPOSER_KEYBOARD_DISMISS_DOWNWARD_DRAG_PX = 16;

/** Downward drag that dismisses even when the list cannot scroll further. */
export const COMPOSER_KEYBOARD_DISMISS_COMMIT_DRAG_PX = 36;

/** Scroll movement toward older messages that confirms dismiss intent early. */
export const COMPOSER_KEYBOARD_DISMISS_SCROLL_CONFIRM_PX = 8;

/** Downward drag paired with scroll confirmation. */
export const COMPOSER_KEYBOARD_DISMISS_SCROLL_DRAG_PX = 24;

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
  window.setTimeout(restoreScrollTop, 50);
  window.visualViewport?.addEventListener("resize", restoreScrollTop, { once: true });
}

/**
 * Dismiss the software keyboard when the user deliberately drags downward in the
 * message list while the composer is focused. Mobile only — desktop is unchanged.
 *
 * True interactive keyboard tracking (keyboard following the finger) is not exposed
 * on mobile web; this is the closest high-quality fallback.
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
    let touchStartScrollTop: number | null = null;
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
      touchStartY = null;
      touchStartScrollTop = null;
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
      touchStartScrollTop = container.scrollTop;
      dismissedForGesture = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (
        dismissedForGesture ||
        touchStartY === null ||
        touchStartScrollTop === null ||
        event.touches.length !== 1 ||
        !isComposerInputFocused(composerInputRef.current)
      ) {
        return;
      }

      const fingerDeltaY = event.touches[0].clientY - touchStartY;

      // Upward finger movement — reading newer messages; never dismiss the keyboard.
      if (fingerDeltaY < 0) {
        return;
      }

      if (fingerDeltaY < COMPOSER_KEYBOARD_DISMISS_DOWNWARD_DRAG_PX) {
        return;
      }

      const scrollTowardOlderMessages =
        touchStartScrollTop - container.scrollTop >= COMPOSER_KEYBOARD_DISMISS_SCROLL_CONFIRM_PX;

      const shouldDismiss =
        fingerDeltaY >= COMPOSER_KEYBOARD_DISMISS_COMMIT_DRAG_PX ||
        (scrollTowardOlderMessages &&
          fingerDeltaY >= COMPOSER_KEYBOARD_DISMISS_SCROLL_DRAG_PX);

      if (!shouldDismiss) {
        return;
      }

      dismissedForGesture = true;
      touchStartY = null;
      touchStartScrollTop = null;
      dismissComposerKeyboard();
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
