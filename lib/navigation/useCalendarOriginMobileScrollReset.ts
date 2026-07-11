"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { parseCalendarOriginFromEventDetail } from "@/lib/calendar";
import { isMobileScrollResetViewport } from "@/lib/navigation/isMobileScrollResetViewport";
import {
  CALENDAR_AGENDA_EVENT_NAV_STORAGE_KEY,
} from "@/lib/navigation/prepareMobileDocumentScrollReset";
import {
  commitCalendarOriginDocumentScrollToTop,
  freezeDocumentScrollAtTop,
} from "@/lib/navigation/scrollPageToTop";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

function isCalendarAgendaNavigationPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(CALENDAR_AGENDA_EVENT_NAV_STORAGE_KEY) === "1";
}

function clearCalendarAgendaNavigationPending(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(CALENDAR_AGENDA_EVENT_NAV_STORAGE_KEY);
}

export function shouldResetCalendarOriginMobileScroll(searchParams: SearchParamsLike): boolean {
  if (!isMobileScrollResetViewport()) {
    return false;
  }

  if (parseCalendarOriginFromEventDetail(searchParams) !== null) {
    return true;
  }

  return isCalendarAgendaNavigationPending();
}

export function useCalendarOriginMobileScrollReset(
  searchParams: SearchParamsLike,
  routeKey: string,
  contentReady: boolean,
): boolean {
  const shouldReset = shouldResetCalendarOriginMobileScroll(searchParams);
  const [scrollReady, setScrollReady] = useState(() => {
    if (searchParams.get("from") === "calendar") {
      return false;
    }

    return !shouldReset;
  });
  const unfreezeRef = useRef<(() => void) | null>(null);
  const previousScrollRestorationRef = useRef<ScrollRestoration | null>(null);

  useLayoutEffect(() => {
    if (!shouldReset) {
      setScrollReady(true);
      return;
    }

    setScrollReady(false);
    previousScrollRestorationRef.current = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    unfreezeRef.current?.();
    unfreezeRef.current = freezeDocumentScrollAtTop();

    if (!contentReady) {
      return () => {
        unfreezeRef.current?.();
        unfreezeRef.current = null;

        if (previousScrollRestorationRef.current !== null) {
          window.history.scrollRestoration = previousScrollRestorationRef.current;
        }
      };
    }

    let cancelCommit = commitCalendarOriginDocumentScrollToTop(() => {
      unfreezeRef.current?.();
      unfreezeRef.current = null;
      clearCalendarAgendaNavigationPending();
      setScrollReady(true);
    });

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      setScrollReady(false);
      cancelCommit();
      unfreezeRef.current?.();
      unfreezeRef.current = freezeDocumentScrollAtTop();
      cancelCommit = commitCalendarOriginDocumentScrollToTop(() => {
        unfreezeRef.current?.();
        unfreezeRef.current = null;
        clearCalendarAgendaNavigationPending();
        setScrollReady(true);
      });
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelCommit();
      unfreezeRef.current?.();
      unfreezeRef.current = null;
      window.removeEventListener("pageshow", handlePageShow);

      if (previousScrollRestorationRef.current !== null) {
        window.history.scrollRestoration = previousScrollRestorationRef.current;
      }
    };
  }, [shouldReset, routeKey, contentReady]);

  return scrollReady;
}
