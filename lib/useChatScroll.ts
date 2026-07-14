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
  messageCount: number;
  lastMessageSenderId: string | null;
  lastMessageIsFromCurrentUser: boolean | null;
  currentUserId: string | null;
  suppressAutoScrollRef?: MutableRefObject<boolean>;
};

export function useChatScroll({
  loading,
  messageCount,
  lastMessageSenderId,
  lastMessageIsFromCurrentUser,
  currentUserId,
  suppressAutoScrollRef,
}: UseChatScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingUserSentScrollRef = useRef(false);
  const pendingVisualAnchorRef = useRef<PendingVisualAnchor | null>(null);
  const pendingScrollPreserveRef = useRef<number | null>(null);
  const previousMessageCountRef = useRef(0);
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

    // flex-col-reverse anchors newest messages at scrollTop ~= 0
    return container.scrollTop <= CHAT_NEAR_BOTTOM_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = scrollRef.current;

      if (!container) {
        return;
      }

      clearPendingScrollPreserve();
      container.scrollTo({ top: 0, behavior });
      hideNewMessagesPill();
    },
    [clearPendingScrollPreserve, hideNewMessagesPill],
  );

  const scrollToBottomSmooth = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  const markUserSentMessage = useCallback(() => {
    pendingUserSentScrollRef.current = true;
    clearPendingScrollPreserve();
  }, [clearPendingScrollPreserve]);

  const captureScrollBeforeIncomingInsert = useCallback(
    (isFromCurrentUser: boolean) => {
      if (isFromCurrentUser) {
        clearPendingScrollPreserve();
        return;
      }

      const container = scrollRef.current;

      if (!container || isNearBottom()) {
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

          console.log("[chat visual anchor]", {
            anchorMessageId: pendingAnchor.anchorMessageId,
            beforeTop: pendingAnchor.anchorRectTop,
            afterTop,
            delta,
            adjustedScrollTop: container.scrollTop,
          });
          return;
        }
      }

      if (fallbackScrollTop !== null) {
        container.scrollTop = fallbackScrollTop;

        console.log("[chat scroll preserve]", {
          previousScrollTop: fallbackScrollTop,
          restoredScrollTop: container.scrollTop,
        });
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
      if (isNearBottom()) {
        hideNewMessagesPill();
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [hideNewMessagesPill, isNearBottom, loading]);

  useEffect(() => {
    if (loading) {
      previousMessageCountRef.current = 0;
      clearPendingScrollPreserve();
      hideNewMessagesPill();
    }
  }, [clearPendingScrollPreserve, hideNewMessagesPill, loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = messageCount;

    const messageCountChanged = messageCount > previousCount && previousCount > 0;

    if (!messageCountChanged) {
      return;
    }

    const senderId = lastMessageSenderId;
    const isOwnMessage = lastMessageIsFromCurrentUser === true;

    if (pendingUserSentScrollRef.current) {
      pendingUserSentScrollRef.current = false;
      clearPendingScrollPreserve();

      if (suppressAutoScrollRef?.current) {
        return;
      }

      console.log("[chat scroll final]", {
        senderId,
        currentUserId,
        isOwnMessage: true,
        action: "scroll",
      });

      requestAnimationFrame(() => scrollToBottom("smooth"));
      return;
    }

    if (isOwnMessage) {
      clearPendingScrollPreserve();

      if (suppressAutoScrollRef?.current) {
        return;
      }

      console.log("[chat scroll final]", {
        senderId,
        currentUserId,
        isOwnMessage: true,
        action: "scroll",
      });

      requestAnimationFrame(() => scrollToBottom("smooth"));
      return;
    }

    const nearBottom = isNearBottom();

    if (!nearBottom) {
      const incomingCount = messageCount - previousCount;
      setNewMessagesPillCount((current) => current + incomingCount);
      setShowNewMessagesPill(true);
      restorePreservedScrollPosition();

      console.log("[chat scroll final]", {
        senderId,
        currentUserId,
        isOwnMessage: false,
        action: "show-pill",
      });
      return;
    }

    clearPendingScrollPreserve();

    console.log("[chat scroll final]", {
      senderId,
      currentUserId,
      isOwnMessage: false,
      action: "noop",
    });
  }, [
    loading,
    messageCount,
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
