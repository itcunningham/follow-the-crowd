"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_BOOKING_FOCUS_FADE_MS,
  CHAT_BOOKING_FOCUS_HOLD_MS,
  type BookingFocusPhase,
  getBookingFocusPhase,
} from "@/lib/chatBookingFocusHighlight";

type ActiveBookingFocusPhase = Exclude<BookingFocusPhase, null>;

type BookingFocusTimers = {
  holdTimeoutId: number;
  removeTimeoutId: number;
};

export function useChatBookingFocusHighlight() {
  const [phasesByMessageId, setPhasesByMessageId] = useState<
    Map<string, ActiveBookingFocusPhase>
  >(() => new Map());
  const timersRef = useRef<Map<string, BookingFocusTimers>>(new Map());

  const clearBookingFocusTimers = useCallback((messageId: string) => {
    const timers = timersRef.current.get(messageId);

    if (!timers) {
      return;
    }

    window.clearTimeout(timers.holdTimeoutId);
    window.clearTimeout(timers.removeTimeoutId);
    timersRef.current.delete(messageId);
  }, []);

  const highlightBookingFocus = useCallback(
    (messageId: string) => {
      clearBookingFocusTimers(messageId);

      setPhasesByMessageId((previous) => {
        const next = new Map(previous);
        next.set(messageId, "active");
        return next;
      });

      const holdTimeoutId = window.setTimeout(() => {
        setPhasesByMessageId((previous) => {
          if (!previous.has(messageId)) {
            return previous;
          }

          const next = new Map(previous);
          next.set(messageId, "fading");
          return next;
        });
      }, CHAT_BOOKING_FOCUS_HOLD_MS);

      const removeTimeoutId = window.setTimeout(() => {
        setPhasesByMessageId((previous) => {
          if (!previous.has(messageId)) {
            return previous;
          }

          const next = new Map(previous);
          next.delete(messageId);
          return next;
        });
        timersRef.current.delete(messageId);
      }, CHAT_BOOKING_FOCUS_HOLD_MS + CHAT_BOOKING_FOCUS_FADE_MS);

      timersRef.current.set(messageId, { holdTimeoutId, removeTimeoutId });
    },
    [clearBookingFocusTimers],
  );

  const getMessageBookingFocusPhase = useCallback(
    (messageId: string): BookingFocusPhase =>
      getBookingFocusPhase(phasesByMessageId, messageId),
    [phasesByMessageId],
  );

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const messageId of timers.keys()) {
        const entry = timers.get(messageId);

        if (!entry) {
          continue;
        }

        window.clearTimeout(entry.holdTimeoutId);
        window.clearTimeout(entry.removeTimeoutId);
      }

      timers.clear();
    };
  }, []);

  return {
    highlightBookingFocus,
    getMessageBookingFocusPhase,
  };
}
