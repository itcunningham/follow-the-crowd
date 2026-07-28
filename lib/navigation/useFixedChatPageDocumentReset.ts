"use client";

import { useEffect, useLayoutEffect } from "react";
import {
  lockFixedChatDocumentScroll,
  prepareFixedChatPageMount,
} from "@/lib/navigation/prepareFixedChatPageMount";
import { runDoubleRafDocumentScrollToTop } from "@/lib/navigation/scrollPageToTop";

/** Lock document scroll while a fixed chat route is active (e.g. DM return from Event Details). */
export function useFixedChatPageDocumentReset(routeKey: string): void {
  useLayoutEffect(() => {
    const unlockDocumentScroll = lockFixedChatDocumentScroll();

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        prepareFixedChatPageMount();
      }
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      unlockDocumentScroll();
    };
  }, [routeKey]);

  useEffect(() => {
    prepareFixedChatPageMount();
    const cancelScrollReset = runDoubleRafDocumentScrollToTop();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        prepareFixedChatPageMount();
      }
    }

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelScrollReset();
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [routeKey]);
}
