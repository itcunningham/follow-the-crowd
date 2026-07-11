"use client";

import { useLayoutEffect, useRef } from "react";
import { isMobileScrollResetViewport } from "@/lib/navigation/isMobileScrollResetViewport";
import { scheduleMobileScrollPageToTop } from "@/lib/navigation/scrollPageToTop";

export function useScrollPageToTop(routeKey: string, contentReady = true): void {
  const previousScrollRestorationRef = useRef<ScrollRestoration | null>(null);

  useLayoutEffect(() => {
    if (!isMobileScrollResetViewport()) {
      return;
    }

    previousScrollRestorationRef.current = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const cancelScheduled = scheduleMobileScrollPageToTop();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        scheduleMobileScrollPageToTop();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelScheduled();
      window.removeEventListener("pageshow", handlePageShow);

      if (previousScrollRestorationRef.current !== null) {
        window.history.scrollRestoration = previousScrollRestorationRef.current;
      }
    };
  }, [routeKey]);

  useLayoutEffect(() => {
    if (!isMobileScrollResetViewport() || !contentReady) {
      return;
    }

    return scheduleMobileScrollPageToTop();
  }, [routeKey, contentReady]);
}
