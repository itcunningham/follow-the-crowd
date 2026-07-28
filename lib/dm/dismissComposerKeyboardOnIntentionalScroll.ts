"use client";

import { useEffect, type RefObject } from "react";
import {
  computeManualMessageListScrollTop,
  nextDownwardDragAtBottomPx,
  shouldDismissComposerKeyboardAtBottom,
} from "@/lib/dm/composerKeyboardDismissPolicy";
import { syncMobileSoftwareKeyboardDocumentState } from "@/lib/navigation/mobileSoftwareKeyboard";
import { getChatMaxScrollTop, CHAT_NEAR_BOTTOM_THRESHOLD_PX } from "@/lib/useChatScroll";

const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";

type ActiveGesture = {
  startX: number;
  startY: number;
  startScrollTop: number;
  lastY: number;
  downwardDragAtBottomPx: number;
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

function readVisibleViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
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
 * While the mobile composer is focused, intercept native message-list scrolling so
 * WebKit cannot auto-dismiss the keyboard on the first touchmove. Manual scroll keeps
 * the keyboard open; blur() runs only after a deliberate downward pull at the newest
 * message edge (see composerKeyboardDismissPolicy.ts).
 */
export function useDismissComposerKeyboardOnIntentionalScroll(
  scrollRef: RefObject<HTMLElement | null>,
  composerInputRef: RefObject<HTMLInputElement | null>,
): void {
  useEffect(() => {
    if (!isMobileChatViewport()) {
      return;
    }

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
      if (!isComposerInputFocused(composerInputRef.current)) {
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
        startScrollTop: container.scrollTop,
        lastY: touch.clientY,
        downwardDragAtBottomPx: 0,
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

      event.preventDefault();

      const touch = event.touches[0];
      const deltaX = touch.clientX - activeGesture.startX;
      const deltaY = touch.clientY - activeGesture.startY;
      const maxScrollTop = getChatMaxScrollTop(container);

      container.scrollTop = computeManualMessageListScrollTop(
        activeGesture.startScrollTop,
        activeGesture.startY,
        touch.clientY,
        maxScrollTop,
      );

      const pinnedToNewest = maxScrollTop - container.scrollTop <= CHAT_NEAR_BOTTOM_THRESHOLD_PX;

      activeGesture.downwardDragAtBottomPx = nextDownwardDragAtBottomPx(
        activeGesture.downwardDragAtBottomPx,
        pinnedToNewest,
        deltaY,
        activeGesture.lastY,
        touch.clientY,
      );
      activeGesture.lastY = touch.clientY;

      if (
        shouldDismissComposerKeyboardAtBottom({
          pinnedToNewest,
          downwardDragAtBottomPx: activeGesture.downwardDragAtBottomPx,
          visibleViewportHeight: readVisibleViewportHeight(),
          deltaX,
          deltaY,
        })
      ) {
        dismissedForGesture = true;
        activeGesture = null;
        dismissComposerKeyboard();
      }
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

// Re-export policy constants for regression tests and documentation.
export {
  COMPOSER_KEYBOARD_DISMISS_AT_BOTTOM_VIEWPORT_RATIO,
  COMPOSER_KEYBOARD_DISMISS_VERTICAL_DOMINANCE_RATIO,
} from "@/lib/dm/composerKeyboardDismissPolicy";
