"use client";

import { useEffect, type RefObject } from "react";
import {
  applyManualMessageListScrollDelta,
  nextDownwardDragAtBottomPx,
  shouldDismissComposerKeyboardAtBottom,
} from "@/lib/dm/composerKeyboardDismissPolicy";
import {
  appendTouchSample,
  applyMomentumFriction,
  applyMomentumScrollStep,
  computeReleaseScrollVelocityPxPerMs,
  shouldStartMomentumScroll,
  type TouchSample,
} from "@/lib/dm/composerMessageListMomentumScroll";
import { syncMobileSoftwareKeyboardDocumentState } from "@/lib/navigation/mobileSoftwareKeyboard";
import { getChatMaxScrollTop, CHAT_NEAR_BOTTOM_THRESHOLD_PX } from "@/lib/useChatScroll";

const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";

type ActiveGesture = {
  startX: number;
  startY: number;
  lastY: number;
  downwardDragAtBottomPx: number;
  samples: TouchSample[];
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
    const composerInput = composerInputRef.current;

    if (!container) {
      return;
    }

    let activeGesture: ActiveGesture | null = null;
    let dismissedKeyboardForGesture = false;
    let momentumFrameId: number | null = null;
    let momentumVelocityPxPerMs = 0;
    let momentumLastFrameTime = 0;

    const cancelMomentumScroll = () => {
      if (momentumFrameId !== null) {
        cancelAnimationFrame(momentumFrameId);
        momentumFrameId = null;
      }

      momentumVelocityPxPerMs = 0;
      momentumLastFrameTime = 0;
    };

    const dismissComposerKeyboard = () => {
      const input = composerInputRef.current;

      if (!input || !isComposerInputFocused(input)) {
        return;
      }

      cancelMomentumScroll();

      preserveScrollPositionDuringKeyboardDismiss(container, () => {
        input.blur();
        syncMobileSoftwareKeyboardDocumentState();
      });
    };

    const resetTouchGesture = () => {
      activeGesture = null;
      dismissedKeyboardForGesture = false;
    };

    const stepMomentumScroll = (frameTime: number) => {
      if (!isComposerInputFocused(composerInputRef.current)) {
        cancelMomentumScroll();
        return;
      }

      if (momentumLastFrameTime === 0) {
        momentumLastFrameTime = frameTime;
        momentumFrameId = requestAnimationFrame(stepMomentumScroll);
        return;
      }

      const frameDeltaMs = Math.min(32, frameTime - momentumLastFrameTime);
      momentumLastFrameTime = frameTime;

      const maxScrollTop = getChatMaxScrollTop(container);
      const nextVelocity = applyMomentumFriction(momentumVelocityPxPerMs, frameDeltaMs);
      const nextStep = applyMomentumScrollStep({
        scrollTop: container.scrollTop,
        velocityPxPerMs: nextVelocity,
        frameDeltaMs,
        maxScrollTop,
      });

      container.scrollTop = nextStep.scrollTop;
      momentumVelocityPxPerMs = nextStep.velocityPxPerMs;

      if (momentumVelocityPxPerMs === 0) {
        cancelMomentumScroll();
        return;
      }

      momentumFrameId = requestAnimationFrame(stepMomentumScroll);
    };

    const startMomentumScroll = (releaseVelocityPxPerMs: number) => {
      if (!shouldStartMomentumScroll(releaseVelocityPxPerMs)) {
        return;
      }

      cancelMomentumScroll();
      momentumVelocityPxPerMs = releaseVelocityPxPerMs;
      momentumLastFrameTime = 0;
      momentumFrameId = requestAnimationFrame(stepMomentumScroll);
    };

    const onTouchStart = (event: TouchEvent) => {
      cancelMomentumScroll();

      if (!isComposerInputFocused(composerInputRef.current)) {
        resetTouchGesture();
        return;
      }

      if (event.touches.length !== 1) {
        resetTouchGesture();
        return;
      }

      const touch = event.touches[0];
      const time = event.timeStamp;

      activeGesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        downwardDragAtBottomPx: 0,
        samples: appendTouchSample([], touch.clientY, time),
      };
      dismissedKeyboardForGesture = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (
        dismissedKeyboardForGesture ||
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
      const previousY = activeGesture.lastY;
      const currentY = touch.clientY;

      container.scrollTop = applyManualMessageListScrollDelta(
        container.scrollTop,
        previousY,
        currentY,
        maxScrollTop,
      );

      activeGesture.samples = appendTouchSample(
        activeGesture.samples,
        currentY,
        event.timeStamp,
      );

      const pinnedToNewest = maxScrollTop - container.scrollTop <= CHAT_NEAR_BOTTOM_THRESHOLD_PX;

      activeGesture.downwardDragAtBottomPx = nextDownwardDragAtBottomPx(
        activeGesture.downwardDragAtBottomPx,
        pinnedToNewest,
        deltaY,
        previousY,
        currentY,
      );
      activeGesture.lastY = currentY;

      if (
        shouldDismissComposerKeyboardAtBottom({
          pinnedToNewest,
          downwardDragAtBottomPx: activeGesture.downwardDragAtBottomPx,
          visibleViewportHeight: readVisibleViewportHeight(),
          deltaX,
          deltaY,
        })
      ) {
        dismissedKeyboardForGesture = true;
        activeGesture = null;
        dismissComposerKeyboard();
      }
    };

    const onTouchEnd = () => {
      if (
        !dismissedKeyboardForGesture &&
        activeGesture !== null &&
        isComposerInputFocused(composerInputRef.current)
      ) {
        const releaseVelocity = computeReleaseScrollVelocityPxPerMs(activeGesture.samples);
        startMomentumScroll(releaseVelocity);
      }

      resetTouchGesture();
    };

    const onComposerBlur = () => {
      cancelMomentumScroll();
      resetTouchGesture();
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });
    composerInput?.addEventListener("blur", onComposerBlur);

    return () => {
      cancelMomentumScroll();
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      composerInput?.removeEventListener("blur", onComposerBlur);
    };
  }, [composerInputRef, scrollRef]);
}

// Re-export policy constants for regression tests and documentation.
export {
  COMPOSER_KEYBOARD_DISMISS_AT_BOTTOM_VIEWPORT_RATIO,
  COMPOSER_KEYBOARD_DISMISS_VERTICAL_DOMINANCE_RATIO,
} from "@/lib/dm/composerKeyboardDismissPolicy";
