"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { CHAT_MESSAGE_ID_ATTR } from "@/lib/useChatScroll";
import { computeChatMessageCenterScrollTop } from "@/lib/dm/chatBookingTarget";

export const CHAT_MESSAGE_TARGET_PARAM = "message";

const MESSAGE_TARGET_SCROLL_MAX_ATTEMPTS = 12;
const MESSAGE_TARGET_SCROLL_RETRY_MS = 50;

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

    const releaseAutoScrollSuppression = () => {
      completedRef.current = true;
      suppressAutoScrollRef.current = false;
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
      onTargetFound(targetMessageId);
      releaseAutoScrollSuppression();
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
    };
  }, [targetMessageId, loading, scrollRef, onTargetFound, onTargetMissing, suppressAutoScrollRef]);
}
