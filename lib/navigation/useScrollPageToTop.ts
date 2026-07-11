"use client";

import { useLayoutEffect, useRef } from "react";
import { scheduleScrollPageToTop } from "@/lib/navigation/scrollPageToTop";

export function useScrollPageToTop(routeKey: string, contentReady = true): void {
  const previousScrollRestorationRef = useRef<ScrollRestoration | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    previousScrollRestorationRef.current = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    scheduleScrollPageToTop();

    return () => {
      if (previousScrollRestorationRef.current !== null) {
        window.history.scrollRestoration = previousScrollRestorationRef.current;
      }
    };
  }, [routeKey]);

  useLayoutEffect(() => {
    if (!contentReady) {
      return;
    }

    scheduleScrollPageToTop();
  }, [routeKey, contentReady]);
}
