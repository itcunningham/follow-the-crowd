"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_NEW_MESSAGE_HIGHLIGHT_DURATION_MS } from "@/lib/chatNewMessageHighlight";

export function useChatNewMessageHighlight() {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const addHighlightedMessageId = useCallback(
    (messageId: string, isFromCurrentUser = false) => {
      const added = !isFromCurrentUser;

      console.log("[chat highlight] received", {
        messageId,
        fromCurrentUser: isFromCurrentUser,
        added,
      });

      if (!added) {
        return;
      }

      setHighlightedIds((previous) => {
        const next = new Set(previous);
        next.add(messageId);
        return next;
      });

      const existingTimeout = timeoutsRef.current.get(messageId);

      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
      }

      const timeoutId = window.setTimeout(() => {
        setHighlightedIds((previous) => {
          const next = new Set(previous);
          next.delete(messageId);
          return next;
        });
        timeoutsRef.current.delete(messageId);
      }, CHAT_NEW_MESSAGE_HIGHLIGHT_DURATION_MS);

      timeoutsRef.current.set(messageId, timeoutId);
    },
    [],
  );

  const isMessageHighlighted = useCallback(
    (messageId: string) => highlightedIds.has(messageId),
    [highlightedIds],
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;

    return () => {
      for (const timeoutId of timeouts.values()) {
        window.clearTimeout(timeoutId);
      }

      timeouts.clear();
    };
  }, []);

  return {
    addHighlightedMessageId,
    highlightIncomingMessage: addHighlightedMessageId,
    isMessageHighlighted,
  };
}
