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
}: {
  conversationId: string;
  loading: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  suppressAutoScrollRef: RefObject<boolean>;
}) {
  const pendingScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    pendingScrollTopRef.current = consumeDmChatScrollPosition(conversationId);

    if (pendingScrollTopRef.current !== null) {
      suppressAutoScrollRef.current = true;
    }
  }, [conversationId, suppressAutoScrollRef]);

  useEffect(() => {
    function handleProfileLinkClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href*='/profile/']");

      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      const container = scrollRef.current;

      if (!container) {
        return;
      }

      saveDmChatScrollPosition(conversationId, container.scrollTop);
    }

    document.addEventListener("click", handleProfileLinkClick, true);

    return () => {
      document.removeEventListener("click", handleProfileLinkClick, true);
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
