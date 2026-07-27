import { useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from "react";
import {
  findDmMessageIdForBookingRequest,
  type BookingRequestMessageSource,
} from "@/lib/bookingRequests";
import { CHAT_MESSAGE_ID_ATTR } from "@/lib/useChatScroll";

export const CHAT_BOOKING_REQUEST_ID_ATTR = "data-chat-booking-request-id";

export const DM_BOOKING_FOCUS_SCROLL_ONLY = "scroll-only";

export type DmBookingFocusMode = "scroll-and-highlight" | "scroll-only";

const BOOKING_TARGET_SCROLL_MAX_ATTEMPTS = 12;
const BOOKING_TARGET_SCROLL_RETRY_MS = 50;

export function parseDmBookingRequestIdParam(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export function parseDmBookingFocusMode(
  value: string | null | undefined,
): DmBookingFocusMode {
  return value?.trim() === DM_BOOKING_FOCUS_SCROLL_ONLY
    ? "scroll-only"
    : "scroll-and-highlight";
}

export type DmBookingTarget = {
  scrollTargetBookingRequestId: string | null;
  highlightTargetBookingRequestId: string | null;
  bookingFocusMode: DmBookingFocusMode;
};

export function resolveDmBookingTarget(getParam: (key: string) => string | null): DmBookingTarget {
  const scrollTargetBookingRequestId = parseDmBookingRequestIdParam(
    getParam("bookingRequestId"),
  );
  const bookingFocusMode = parseDmBookingFocusMode(getParam("bookingFocus"));
  const highlightTargetBookingRequestId =
    scrollTargetBookingRequestId && bookingFocusMode !== "scroll-only"
      ? scrollTargetBookingRequestId
      : null;

  return {
    scrollTargetBookingRequestId,
    highlightTargetBookingRequestId,
    bookingFocusMode,
  };
}

type UseChatBookingTargetScrollOptions = {
  scrollTargetBookingRequestId: string | null;
  highlightTargetBookingRequestId: string | null;
  loading: boolean;
  messages: BookingRequestMessageSource[];
  scrollRef: RefObject<HTMLDivElement | null>;
  highlightBookingFocus: (messageId: string) => void;
  suppressAutoScrollRef: MutableRefObject<boolean>;
};

export function useChatBookingTargetScroll({
  scrollTargetBookingRequestId,
  highlightTargetBookingRequestId,
  loading,
  messages,
  scrollRef,
  highlightBookingFocus,
  suppressAutoScrollRef,
}: UseChatBookingTargetScrollOptions) {
  const targetMessageId = useMemo(
    () =>
      scrollTargetBookingRequestId
        ? findDmMessageIdForBookingRequest(messages, scrollTargetBookingRequestId)
        : null,
    [messages, scrollTargetBookingRequestId],
  );
  const scrollAttemptRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    scrollAttemptRef.current = 0;
    completedRef.current = false;
    suppressAutoScrollRef.current = Boolean(scrollTargetBookingRequestId);
  }, [scrollTargetBookingRequestId, suppressAutoScrollRef]);

  useEffect(() => {
    if (!scrollTargetBookingRequestId || loading || completedRef.current) {
      return;
    }

    if (!targetMessageId) {
      completedRef.current = true;
      suppressAutoScrollRef.current = false;
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

      messageElement.scrollIntoView({ block: "center", behavior: "auto" });

      if (highlightTargetBookingRequestId) {
        highlightBookingFocus(targetMessageId);
      }

      releaseAutoScrollSuppression();
      return true;
    };

    const scheduleRetry = () => {
      if (cancelled || completedRef.current) {
        return;
      }

      scrollAttemptRef.current += 1;

      if (scrollAttemptRef.current >= BOOKING_TARGET_SCROLL_MAX_ATTEMPTS) {
        releaseAutoScrollSuppression();
        return;
      }

      retryTimeoutId = window.setTimeout(attemptScroll, BOOKING_TARGET_SCROLL_RETRY_MS);
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
  }, [
    highlightBookingFocus,
    highlightTargetBookingRequestId,
    loading,
    scrollRef,
    scrollTargetBookingRequestId,
    suppressAutoScrollRef,
    targetMessageId,
  ]);
}
