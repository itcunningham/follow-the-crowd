"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import type { CalendarItem, CalendarOriginState } from "@/lib/calendar";
import { resolvePlannerCalendarItemHref } from "@/lib/calendar";
import { prepareCalendarAgendaEventNavigation } from "@/lib/navigation/prepareMobileDocumentScrollReset";

export function usePlannerCalendarItemNavigation(
  item: CalendarItem,
  calendarOrigin: CalendarOriginState,
) {
  const router = useRouter();
  const navigatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{
    pointerId: number;
    cancelled: boolean;
  } | null>(null);

  const eventDetailHref = useMemo(
    () => resolvePlannerCalendarItemHref(item, calendarOrigin),
    [calendarOrigin, item],
  );

  const performNavigation = useCallback(
    (navigateFrom: "pointerup" | "click") => {
      if (!eventDetailHref || navigatedThisGestureRef.current) {
        return;
      }

      navigatedThisGestureRef.current = true;
      prepareCalendarAgendaEventNavigation();

      if (navigateFrom === "pointerup") {
        window.location.assign(eventDetailHref);
        return;
      }

      router.push(eventDetailHref, { scroll: false });
    },
    [eventDetailHref, router],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!event.isPrimary) {
      return;
    }

    navigatedThisGestureRef.current = false;
    activeGestureRef.current = {
      pointerId: event.pointerId,
      cancelled: false,
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const gesture = activeGestureRef.current;

      if (!gesture || event.pointerId !== gesture.pointerId || gesture.cancelled) {
        return;
      }

      activeGestureRef.current = null;

      if (event.pointerType === "touch") {
        performNavigation("pointerup");
      }
    },
    [performNavigation],
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const gesture = activeGestureRef.current;

    if (gesture && event.pointerId === gesture.pointerId) {
      gesture.cancelled = true;
      activeGestureRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (navigatedThisGestureRef.current) {
      return;
    }

    performNavigation("click");
  }, [performNavigation]);

  return {
    eventDetailHref,
    handleClick,
    handlePointerCancel,
    handlePointerDown,
    handlePointerUp,
  };
}
