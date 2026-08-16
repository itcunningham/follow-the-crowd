"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import {
  CHAT_MESSAGE_ID_ATTR,
  syncPinnedToBottomRefAfterDirectScroll,
} from "@/lib/useChatScroll";
import { computeChatMessageCenterScrollTop } from "@/lib/dm/chatBookingTarget";

export const CHAT_MESSAGE_TARGET_PARAM = "message";

const MESSAGE_TARGET_SCROLL_MAX_ATTEMPTS = 12;
const MESSAGE_TARGET_SCROLL_RETRY_MS = 50;

/**
 * Landing on the target is not the same as staying on it. Releasing
 * suppression in the same tick as the scroll (what this hook used to do) left
 * the position defended by `pinnedToBottomRef` alone, and everything that
 * settles *after* first paint gets a turn at it: attachment images finishing
 * decode, the crew page's artwork refresh on visibilitychange, the DM page's
 * 5s read-receipt poll, a realtime message arriving, the highlight timeout
 * expiring. Any one of them that re-pins and scrolls wins, and the reader is
 * yanked to the bottom a beat after arriving -- the reported symptom.
 *
 * So the target owns the viewport for a short settling window instead: keep
 * suppression on, re-assert the target position on each layout change, and
 * only hand control back once layout has been quiet, the budget is spent, or
 * the user takes over by scrolling themselves.
 *
 * Both windows are measured, not guessed. Tracing a real Production chat at
 * 320px every 100ms showed content still settling in bursts long after the
 * target scroll: layout changes at ~2.06s, then a 1.46s gap, then ~3.62s,
 * ~3.72s, ~3.83s, ~4.63s, ~4.74s, ~5.33s (avatars and attachment images
 * decoding). The original 400ms quiet window closed during that 1.46s gap, so
 * every later change went unguarded -- and because the chat container sets
 * `[overflow-anchor:none]`, content growing ABOVE the target does not move
 * scrollTop, it slides the target down the viewport instead. That is the
 * small downward drift: 163px on crew at 320px, 83px on a DM image target.
 *
 * The quiet window therefore has to bridge the largest observed gap (1.46s),
 * and the hard budget has to outlast the last observed change (5.33s).
 */
const MESSAGE_TARGET_SETTLE_QUIET_MS = 1800;
const MESSAGE_TARGET_SETTLE_MAX_MS = 8000;

/** Real user takeover -- these are gestures, never anything an effect emits. */
const USER_TAKEOVER_EVENTS = ["pointerdown", "touchstart", "wheel", "keydown"] as const;

export function parseChatMessageTargetIdParam(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function clampChatScrollTop(container: HTMLElement): void {
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

  if (container.scrollTop > maxScrollTop) {
    container.scrollTop = maxScrollTop;
  }

  if (container.scrollTop < 0) {
    container.scrollTop = 0;
  }
}

type UseChatMessageTargetScrollOptions = {
  /** A real notifications.message_id read from the `message` query param. */
  targetMessageId: string | null;
  loading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onTargetFound: (messageId: string) => void;
  /** Called once the target couldn't be found after every retry -- e.g. the
   * message was deleted, or (today) simply hasn't rendered yet. Callers use
   * this to fall back to opening the conversation normally. */
  onTargetMissing?: () => void;
  suppressAutoScrollRef: MutableRefObject<boolean>;
  pinnedToBottomRef: MutableRefObject<boolean>;
};

/**
 * Scrolls a chat message list to a specific message named by a push
 * notification's deep link, then hands off to the caller's highlight
 * callback. Both chat pages currently load a conversation's full history on
 * mount (no pagination/virtualization), so the target is always already
 * rendered once `loading` clears -- the retry loop below exists only to
 * survive the first couple of paint frames, not to wait on additional
 * fetches. If pagination is ever added, `onTargetMissing` (fired after
 * `MESSAGE_TARGET_SCROLL_MAX_ATTEMPTS` retries) is the natural place to
 * trigger loading older history before giving up.
 */
export function useChatMessageTargetScroll({
  targetMessageId,
  loading,
  scrollRef,
  onTargetFound,
  onTargetMissing,
  suppressAutoScrollRef,
  pinnedToBottomRef,
}: UseChatMessageTargetScrollOptions) {
  const scrollAttemptRef = useRef(0);
  const completedRef = useRef(false);
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastTargetRef.current === targetMessageId) {
      return;
    }

    lastTargetRef.current = targetMessageId;
    scrollAttemptRef.current = 0;
    completedRef.current = false;

    // Only ever claim suppression, never release it here -- this ref is
    // shared with sibling scroll-target hooks (e.g. the DM page's booking
    // target). Writing `false` unconditionally would race whichever of them
    // mounts last and clobber a suppression another flow still needs; not
    // writing at all when we have no target of our own leaves that decision
    // to whichever flow does.
    if (targetMessageId) {
      suppressAutoScrollRef.current = true;
    }
  }, [targetMessageId, suppressAutoScrollRef]);

  useEffect(() => {
    if (!targetMessageId || loading || completedRef.current) {
      return;
    }

    let cancelled = false;
    let retryTimeoutId: number | undefined;
    let settleObserver: ResizeObserver | undefined;
    let settleQuietTimeoutId: number | undefined;
    let settleMaxTimeoutId: number | undefined;
    let endSettle: (() => void) | undefined;

    const releaseAutoScrollSuppression = () => {
      completedRef.current = true;
      suppressAutoScrollRef.current = false;
    };

    /**
     * Holds the viewport on `messageElement` until layout stops moving.
     * Suppression stays on for the whole window, so any sibling effect that
     * tries to scroll to the bottom in the meantime is a no-op rather than a
     * race we have to win.
     */
    const holdTargetUntilSettled = (messageElement: HTMLElement, container: HTMLElement) => {
      let removeViewportListeners: (() => void) | undefined;

      const reassert = () => {
        // Re-measure every time: the whole point is that layout moved.
        container.scrollTop = computeChatMessageCenterScrollTop(container, messageElement);
        clampChatScrollTop(container);
        syncPinnedToBottomRefAfterDirectScroll(container, pinnedToBottomRef);
      };

      endSettle = () => {
        if (!endSettle) {
          return;
        }

        endSettle = undefined;
        settleObserver?.disconnect();
        settleObserver = undefined;
        removeViewportListeners?.();
        removeViewportListeners = undefined;

        if (settleQuietTimeoutId !== undefined) window.clearTimeout(settleQuietTimeoutId);
        if (settleMaxTimeoutId !== undefined) window.clearTimeout(settleMaxTimeoutId);

        for (const eventName of USER_TAKEOVER_EVENTS) {
          container.removeEventListener(eventName, handleUserTakeover);
        }

        // Leave pinnedToBottomRef agreeing with wherever we actually ended up,
        // so normal chat behaviour resumes from an honest starting point.
        syncPinnedToBottomRefAfterDirectScroll(container, pinnedToBottomRef);
        releaseAutoScrollSuppression();
      };

      function handleUserTakeover() {
        // The reader has taken over -- stop fighting them immediately.
        endSettle?.();
      }

      const restartQuietWindow = () => {
        if (settleQuietTimeoutId !== undefined) {
          window.clearTimeout(settleQuietTimeoutId);
        }

        settleQuietTimeoutId = window.setTimeout(() => endSettle?.(), MESSAGE_TARGET_SETTLE_QUIET_MS);
      };

      for (const eventName of USER_TAKEOVER_EVENTS) {
        container.addEventListener(eventName, handleUserTakeover, { passive: true });
      }

      // A ResizeObserver on the container and content root catches content
      // settling, but not the iOS-only case where the *viewport* itself
      // resizes as the PWA finishes resuming (URL bar / safe-area settling).
      // That moves the target without resizing anything we observe, and it is
      // not reproducible headless, so it is guarded by signal rather than by
      // evidence we could gather here.
      const handleViewportSettle = () => {
        if (!endSettle) {
          return;
        }

        reassert();
        restartQuietWindow();
      };

      window.addEventListener("resize", handleViewportSettle);
      window.visualViewport?.addEventListener("resize", handleViewportSettle);
      window.visualViewport?.addEventListener("scroll", handleViewportSettle);
      removeViewportListeners = () => {
        window.removeEventListener("resize", handleViewportSettle);
        window.visualViewport?.removeEventListener("resize", handleViewportSettle);
        window.visualViewport?.removeEventListener("scroll", handleViewportSettle);
      };

      if (typeof ResizeObserver !== "undefined") {
        settleObserver = new ResizeObserver(() => {
          if (!endSettle) {
            return;
          }

          reassert();
          restartQuietWindow();
        });

        settleObserver.observe(container);

        const contentRoot = container.querySelector<HTMLElement>("[data-chat-content-root]");

        if (contentRoot) {
          settleObserver.observe(contentRoot);
        }
      }

      restartQuietWindow();
      settleMaxTimeoutId = window.setTimeout(() => endSettle?.(), MESSAGE_TARGET_SETTLE_MAX_MS);
    };

    const scrollToTarget = () => {
      if (cancelled || completedRef.current) {
        return true;
      }

      const container = scrollRef.current;

      if (!container) {
        return false;
      }

      const messageElement = container.querySelector<HTMLElement>(
        `[${CHAT_MESSAGE_ID_ATTR}="${CSS.escape(targetMessageId)}"]`,
      );

      if (!messageElement) {
        return false;
      }

      container.scrollTop = computeChatMessageCenterScrollTop(container, messageElement);
      clampChatScrollTop(container);
      // Must run before releaseAutoScrollSuppression -- see
      // syncPinnedToBottomRefAfterDirectScroll's doc comment. Without this,
      // pinnedToBottomRef stays stale `true` from mount, and the next layout
      // change (e.g. an attachment image finishing decode) reads it via
      // useChatScroll's ResizeObserver effect and silently snaps back to the
      // bottom once suppression drops.
      syncPinnedToBottomRefAfterDirectScroll(container, pinnedToBottomRef);
      onTargetFound(targetMessageId);
      // Mark the retry loop done, but deliberately do NOT drop suppression
      // yet -- holdTargetUntilSettled owns that, once layout is quiet.
      completedRef.current = true;
      holdTargetUntilSettled(messageElement, container);
      return true;
    };

    const scheduleRetry = () => {
      if (cancelled || completedRef.current) {
        return;
      }

      scrollAttemptRef.current += 1;

      if (scrollAttemptRef.current >= MESSAGE_TARGET_SCROLL_MAX_ATTEMPTS) {
        // Release suppression before the caller's fallback runs, so a
        // fallback scroll-to-bottom isn't itself suppressed by our own flag.
        releaseAutoScrollSuppression();
        onTargetMissing?.();
        return;
      }

      retryTimeoutId = window.setTimeout(attemptScroll, MESSAGE_TARGET_SCROLL_RETRY_MS);
    };

    const attemptScroll = () => {
      if (scrollToTarget()) {
        return;
      }

      scheduleRetry();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(attemptScroll);
    });

    return () => {
      cancelled = true;

      if (retryTimeoutId !== undefined) {
        window.clearTimeout(retryTimeoutId);
      }

      // Unmounting or retargeting mid-settle must not strand suppression on --
      // it is shared with the sibling scroll flows, and a stuck `true` would
      // silently disable scroll-to-bottom for the rest of the page's life.
      endSettle?.();
    };
  }, [
    targetMessageId,
    loading,
    scrollRef,
    onTargetFound,
    onTargetMissing,
    suppressAutoScrollRef,
    pinnedToBottomRef,
  ]);
}
