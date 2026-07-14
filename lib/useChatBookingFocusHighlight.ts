"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_BOOKING_FOCUS_TOTAL_MS } from "@/lib/chatBookingFocusHighlight";

export function useChatBookingFocusHighlight() {
  const [focusedIds, setFocusedIds] = useState<Set<string>>(() => new Set());
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const highlightBookingFocus = useCallback((messageId: string) => {
    setFocusedIds((previous) => {
      const next = new Set(previous);
      next.add(messageId);
      return next;
    });

    const existingTimeout = timeoutsRef.current.get(messageId);

    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      setFocusedIds((previous) => {
        const next = new Set(previous);
        next.delete(messageId);
        return next;
      });
      timeoutsRef.current.delete(messageId);
    }, CHAT_BOOKING_FOCUS_TOTAL_MS);

    timeoutsRef.current.set(messageId, timeoutId);
  }, []);

  const isBookingFocusHighlighted = useCallback(
    (messageId: string) => focusedIds.has(messageId),
    [focusedIds],
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
    highlightBookingFocus,
    isBookingFocusHighlighted,
  };
}
