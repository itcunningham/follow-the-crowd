"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  consumeDmChatScrollPosition,
  saveDmChatScrollPosition,
} from "@/lib/dm/dmChatScrollRestoration";

export function useDmChatScrollRestoreOnProfileReturn({
  conversationId,
  loading,
  scrollRef,
  suppressAutoScrollRef,
  shouldRestoreScroll,
}: {
  conversationId: string;
  loading: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  suppressAutoScrollRef: RefObject<boolean>;
  /** Only true when navigation explicitly signals a return from that user's profile or from Event Details ("View event"). */
  shouldRestoreScroll: boolean;
}) {
  const pendingScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldRestoreScroll) {
      return;
    }

    pendingScrollTopRef.current = consumeDmChatScrollPosition(conversationId);

    if (pendingScrollTopRef.current !== null) {
      suppressAutoScrollRef.current = true;
    }
  }, [conversationId, shouldRestoreScroll, suppressAutoScrollRef]);

  useEffect(() => {
    // Also matches "View event" links on booking cards (href like
    // /events/{id}?...&restoreScroll=1, set by buildEventDetailFromDmHref) so
    // that round trip gets the same precise-position save as profile links.
    function handleReturnableLinkClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href*='/profile/'], a[href*='/events/']");

      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      const container = scrollRef.current;

      if (!container) {
        return;
      }

      saveDmChatScrollPosition(conversationId, container.scrollTop);
    }

    document.addEventListener("click", handleReturnableLinkClick, true);

    return () => {
      document.removeEventListener("click", handleReturnableLinkClick, true);
    };
  }, [conversationId, scrollRef]);

  useEffect(() => {
    if (loading || pendingScrollTopRef.current === null) {
      return;
    }

    const scrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;

    function restoreScrollTop() {
      const container = scrollRef.current;

      if (!container) {
        return;
      }

      container.scrollTop = scrollTop;
    }

    requestAnimationFrame(() => {
      restoreScrollTop();
      requestAnimationFrame(restoreScrollTop);
    });
    window.setTimeout(restoreScrollTop, 50);
  }, [loading, scrollRef]);
}
