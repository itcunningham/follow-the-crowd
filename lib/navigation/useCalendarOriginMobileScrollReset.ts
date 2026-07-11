"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { parseCalendarOriginFromEventDetail } from "@/lib/calendar";
import { isMobileScrollResetViewport } from "@/lib/navigation/isMobileScrollResetViewport";
import { runDoubleRafDocumentScrollToTop } from "@/lib/navigation/scrollPageToTop";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

function shouldResetCalendarOriginMobileScroll(searchParams: SearchParamsLike): boolean {
  return (
    isMobileScrollResetViewport() &&
    parseCalendarOriginFromEventDetail(searchParams) !== null
  );
}

export function useCalendarOriginMobileScrollReset(
  searchParams: SearchParamsLike,
  routeKey: string,
  contentReady: boolean,
): boolean {
  const shouldReset = shouldResetCalendarOriginMobileScroll(searchParams);
  const [scrollReady, setScrollReady] = useState(() => !shouldReset);
  const previousScrollRestorationRef = useRef<ScrollRestoration | null>(null);

  useLayoutEffect(() => {
    if (!shouldReset) {
      setScrollReady(true);
      return;
    }

    previousScrollRestorationRef.current = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      if (previousScrollRestorationRef.current !== null) {
        window.history.scrollRestoration = previousScrollRestorationRef.current;
      }
    };
  }, [shouldReset, routeKey]);

  useLayoutEffect(() => {
    if (!shouldReset) {
      return;
    }

    if (!contentReady) {
      setScrollReady(false);
      return;
    }

    setScrollReady(false);

    let cancelScroll = runDoubleRafDocumentScrollToTop(() => {
      setScrollReady(true);
    });

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      setScrollReady(false);
      cancelScroll();
      cancelScroll = runDoubleRafDocumentScrollToTop(() => {
        setScrollReady(true);
      });
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelScroll();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [shouldReset, routeKey, contentReady]);

  return scrollReady;
}
