"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

export const CHAT_NEAR_BOTTOM_THRESHOLD_PX = 120;
export const CHAT_MESSAGE_ID_ATTR = "data-chat-message-id";

export type ChatMessageClientScrollMeta = {
  isFromCurrentUser: boolean;
};

export type ChatMessageWithScrollMeta = {
  user_id: string;
  _clientScrollMeta?: ChatMessageClientScrollMeta;
};

type PendingVisualAnchor = {
  anchorMessageId: string;
  anchorRectTop: number;
  previousScrollTop: number;
};

export function getChatMaxScrollTop(container: HTMLElement): number {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

export function shouldKeepChatPinnedAfterLayoutChange(
  wasPinnedToBottom: boolean,
  autoScrollSuppressed = false,
): boolean {
  return wasPinnedToBottom && !autoScrollSuppressed;
}

export function tagChatMessageForScroll<T extends { user_id: string }>(
  message: T,
  currentUserId: string | null,
): T & { _clientScrollMeta: ChatMessageClientScrollMeta } {
  return {
    ...message,
    _clientScrollMeta: {
      isFromCurrentUser: currentUserId !== null && message.user_id === currentUserId,
    },
  };
}

/** Returns IDs appended to the end of the list — not updates, reorders, or removals. */
export function getAppendedMessageIds(
  previousIds: readonly string[],
  nextIds: readonly string[],
): string[] {
  if (nextIds.length <= previousIds.length) {
    return [];
  }

  const isAppendOnly = previousIds.every((id, index) => nextIds[index] === id);

  if (!isAppendOnly) {
    return [];
  }

  return nextIds.slice(previousIds.length);
}

function findTopmostVisibleMessageAnchor(container: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const messageElements = container.querySelectorAll<HTMLElement>(
    `[${CHAT_MESSAGE_ID_ATTR}]`,
  );

  let anchor: { id: string; rectTop: number } | null = null;

  for (const element of messageElements) {
    const rect = element.getBoundingClientRect();

    if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) {
      continue;
    }

    const id = element.getAttribute(CHAT_MESSAGE_ID_ATTR);

    if (!id) {
      continue;
    }

    if (!anchor || rect.top < anchor.rectTop) {
      anchor = { id, rectTop: rect.top };
    }
  }

  return anchor;
}

type UseChatScrollOptions = {
  loading: boolean;
  messageIds: readonly string[];
  lastMessageSenderId: string | null;
  lastMessageIsFromCurrentUser: boolean | null;
  currentUserId: string | null;
  suppressAutoScrollRef?: MutableRefObject<boolean>;
  /**
   * Optional fresh-per-navigation marker (see `buildDmChatFreshOpenHref`). When
   * provided and it changes relative to the last view this hook scrolled for,
   * forces one fresh initial scroll-to-bottom evaluation even if `loading`
   * doesn't cycle again — i.e. even when the caller's component instance may
   * have been reused across an away-and-back navigation. Omit for callers
   * (e.g. crew chat) that don't need this: behaviour is unchanged when absent.
   */
  freshOpenToken?: string | null;
};

export function useChatScroll({
  loading,
  messageIds,
  lastMessageSenderId,
  lastMessageIsFromCurrentUser,
  currentUserId,
  suppressAutoScrollRef,
  freshOpenToken,
}: UseChatScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingOwnAppendPinnedRef = useRef<boolean | null>(null);
  const pendingIncomingAppendPinnedRef = useRef<boolean | null>(null);
  const pendingVisualAnchorRef = useRef<PendingVisualAnchor | null>(null);
  const pendingScrollPreserveRef = useRef<number | null>(null);
  const previousMessageIdsRef = useRef<string[]>([]);
  const needsInitialScrollRef = useRef(true);
  const lastScrolledFreshOpenTokenRef = useRef(freshOpenToken);
  const pinnedToBottomRef = useRef(true);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const [newMessagesPillCount, setNewMessagesPillCount] = useState(0);

  const hideNewMessagesPill = useCallback(() => {
    setShowNewMessagesPill(false);
    setNewMessagesPillCount(0);
  }, []);

  const clearPendingScrollPreserve = useCallback(() => {
    pendingVisualAnchorRef.current = null;
    pendingScrollPreserveRef.current = null;
  }, []);

  const isNearBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) {
      return true;
    }

    const maxScrollTop = getChatMaxScrollTop(container);

    return maxScrollTop - container.scrollTop <= CHAT_NEAR_BOTTOM_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = scrollRef.current;

      if (!container || suppressAutoScrollRef?.current) {
        return;
      }

      clearPendingScrollPreserve();
      pinnedToBottomRef.current = true;
      container.scrollTo({ top: getChatMaxScrollTop(container), behavior });
      hideNewMessagesPill();
    },
    [clearPendingScrollPreserve, hideNewMessagesPill, suppressAutoScrollRef],
  );

  const scrollToBottomSmooth = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  const markUserSentMessage = useCallback(() => {
    // Sending while reading history must not pull someone away from their
    // place. Capture the bottom-pinned state before the optimistic message
    // changes the list height; the append effect consumes this one-shot
    // intent after React renders the new message.
    const wasPinnedToBottom = isNearBottom();
    pendingOwnAppendPinnedRef.current = wasPinnedToBottom;

    if (wasPinnedToBottom) {
      pinnedToBottomRef.current = true;
    }

    clearPendingScrollPreserve();
  }, [clearPendingScrollPreserve, isNearBottom]);

  const captureScrollBeforeIncomingInsert = useCallback(
    (isFromCurrentUser: boolean) => {
      if (isFromCurrentUser) {
        pendingIncomingAppendPinnedRef.current = null;
        pinnedToBottomRef.current = true;
        clearPendingScrollPreserve();
        return;
      }

      const container = scrollRef.current;

      if (!container) {
        return;
      }

      const wasPinnedToBottom = isNearBottom();
      pendingIncomingAppendPinnedRef.current = wasPinnedToBottom;

      if (wasPinnedToBottom) {
        pinnedToBottomRef.current = true;
        clearPendingScrollPreserve();
        return;
      }

      const previousScrollTop = container.scrollTop;
      const anchor = findTopmostVisibleMessageAnchor(container);

      pendingScrollPreserveRef.current = previousScrollTop;

      if (anchor) {
        pendingVisualAnchorRef.current = {
          anchorMessageId: anchor.id,
          anchorRectTop: anchor.rectTop,
          previousScrollTop,
        };
        return;
      }

      pendingVisualAnchorRef.current = null;
    },
    [clearPendingScrollPreserve, isNearBottom],
  );

  const restorePreservedScrollPosition = useCallback(() => {
    const pendingAnchor = pendingVisualAnchorRef.current;
    const fallbackScrollTop = pendingScrollPreserveRef.current;

    pendingVisualAnchorRef.current = null;
    pendingScrollPreserveRef.current = null;

    const adjust = () => {
      const container = scrollRef.current;

      if (!container) {
        return;
      }

      if (pendingAnchor) {
        const anchorElement = container.querySelector<HTMLElement>(
          `[${CHAT_MESSAGE_ID_ATTR}="${CSS.escape(pendingAnchor.anchorMessageId)}"]`,
        );

        if (anchorElement) {
          const afterTop = anchorElement.getBoundingClientRect().top;
          const delta = afterTop - pendingAnchor.anchorRectTop;

          if (delta !== 0) {
            container.scrollTop += delta;
          }

          return;
        }
      }

      if (fallbackScrollTop !== null) {
        container.scrollTop = fallbackScrollTop;
      }
    };

    requestAnimationFrame(() => {
      adjust();
      requestAnimationFrame(adjust);
    });
    window.setTimeout(adjust, 50);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    function handleScroll() {
      const nearBottom = isNearBottom();
      pinnedToBottomRef.current = nearBottom;

      if (nearBottom) {
        hideNewMessagesPill();
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [hideNewMessagesPill, isNearBottom, loading]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    // Image attachments use lazy <img> elements with no fixed intrinsic
    // height. Their decoded dimensions can increase the message list after
    // the message-append effect has already scrolled to its then-current
    // bottom. Watch both the scroll container (keyboard/viewport layout
    // changes) and its content root (image/layout changes), but only keep
    // the user pinned when they were already at the newest edge.
    const resizeObserver = new ResizeObserver(() => {
      if (
        !shouldKeepChatPinnedAfterLayoutChange(
          pinnedToBottomRef.current,
          suppressAutoScrollRef?.current,
        )
      ) {
        return;
      }

      requestAnimationFrame(() => {
        if (
          shouldKeepChatPinnedAfterLayoutChange(
            pinnedToBottomRef.current,
            suppressAutoScrollRef?.current,
          )
        ) {
          scrollToBottom("auto");
        }
      });
    });

    resizeObserver.observe(container);

    const contentRoot = container.querySelector<HTMLElement>("[data-chat-content-root]");

    if (contentRoot) {
      resizeObserver.observe(contentRoot);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [loading, messageIds, scrollToBottom, suppressAutoScrollRef]);

  useEffect(() => {
    if (loading) {
      needsInitialScrollRef.current = true;
      previousMessageIdsRef.current = [];
      pendingOwnAppendPinnedRef.current = null;
      pendingIncomingAppendPinnedRef.current = null;
      pinnedToBottomRef.current = true;
      clearPendingScrollPreserve();
      hideNewMessagesPill();
    }
  }, [clearPendingScrollPreserve, hideNewMessagesPill, loading]);

  useEffect(() => {
    if (loading || messageIds.length === 0) {
      return;
    }

    const isFreshOpen =
      freshOpenToken !== undefined &&
      freshOpenToken !== null &&
      freshOpenToken !== lastScrolledFreshOpenTokenRef.current;

    if (!needsInitialScrollRef.current && !isFreshOpen) {
      return;
    }

    needsInitialScrollRef.current = false;

    if (freshOpenToken !== undefined) {
      lastScrolledFreshOpenTokenRef.current = freshOpenToken;
    }

    if (suppressAutoScrollRef?.current) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  }, [loading, messageIds.length, scrollToBottom, suppressAutoScrollRef, freshOpenToken]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const previousIds = previousMessageIdsRef.current;
    previousMessageIdsRef.current = [...messageIds];

    if (previousIds.length === 0) {
      return;
    }

    const appendedIds = getAppendedMessageIds(previousIds, messageIds);

    if (appendedIds.length === 0) {
      return;
    }

    const isOwnMessage = lastMessageIsFromCurrentUser === true;

    const pendingOwnAppendPinned = pendingOwnAppendPinnedRef.current;

    if (pendingOwnAppendPinned !== null) {
      pendingOwnAppendPinnedRef.current = null;
      clearPendingScrollPreserve();

      if (!pendingOwnAppendPinned || suppressAutoScrollRef?.current) {
        return;
      }

      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }

    if (isOwnMessage) {
      clearPendingScrollPreserve();

      if (
        !shouldKeepChatPinnedAfterLayoutChange(
          pinnedToBottomRef.current,
          suppressAutoScrollRef?.current,
        )
      ) {
        return;
      }

      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }

    const pendingIncomingAppendPinned = pendingIncomingAppendPinnedRef.current;
    pendingIncomingAppendPinnedRef.current = null;
    const nearBottom = pendingIncomingAppendPinned ?? isNearBottom();

    if (!nearBottom) {
      if (suppressAutoScrollRef?.current) {
        return;
      }

      setNewMessagesPillCount((current) => current + appendedIds.length);
      setShowNewMessagesPill(true);
      restorePreservedScrollPosition();
      return;
    }

    if (suppressAutoScrollRef?.current) {
      return;
    }

    clearPendingScrollPreserve();
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [
    loading,
    messageIds,
    lastMessageSenderId,
    lastMessageIsFromCurrentUser,
    currentUserId,
    clearPendingScrollPreserve,
    isNearBottom,
    restorePreservedScrollPosition,
    scrollToBottom,
    suppressAutoScrollRef,
  ]);

  return {
    scrollRef,
    bottomRef,
    showNewMessagesPill,
    newMessagesPillCount,
    scrollToBottomSmooth,
    markUserSentMessage,
    captureScrollBeforeIncomingInsert,
  };
}
