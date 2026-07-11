"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { isMobileScrollResetViewport } from "@/lib/navigation/isMobileScrollResetViewport";
import {
  commitMobileDocumentScrollToTop,
  scrollDocumentToTop,
} from "@/lib/navigation/scrollPageToTop";

export function useScrollPageToTop(routeKey: string, contentReady = true): boolean {
  const [scrollReady, setScrollReady] = useState(() => !isMobileScrollResetViewport());
  const previousScrollRestorationRef = useRef<ScrollRestoration | null>(null);

  useLayoutEffect(() => {
    if (!isMobileScrollResetViewport()) {
      return;
    }

    setScrollReady(false);
    previousScrollRestorationRef.current = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    let cancelCommit = commitMobileDocumentScrollToTop(() => {
      setScrollReady(true);
    });

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      setScrollReady(false);
      cancelCommit();
      cancelCommit = commitMobileDocumentScrollToTop(() => {
        setScrollReady(true);
      });
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelCommit();
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

    scrollDocumentToTop();
    const rafId = requestAnimationFrame(scrollDocumentToTop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [routeKey, contentReady]);

  return scrollReady;
}
