import {
  buildCalendarOriginReturnHref,
  parseCalendarOriginFromEventDetail,
} from "@/lib/calendar";

export type DmThreadBackContext = {
  from?: string | null;
  tab?: string | null;
  profileUserId?: string | null;
  calendarDate?: string | null;
  calendarView?: string | null;
  calendarMonth?: string | null;
};

export function resolveDmThreadBackHref(context: DmThreadBackContext): string {
  const from = context.from?.trim();

  if (from === "calendar") {
    const calendarOrigin = parseCalendarOriginFromEventDetail({
      get: (key) => {
        if (key === "from") {
          return context.from ?? null;
        }

        if (key === "calendarDate") {
          return context.calendarDate ?? null;
        }

        if (key === "calendarView") {
          return context.calendarView ?? null;
        }

        if (key === "calendarMonth") {
          return context.calendarMonth ?? null;
        }

        return null;
      },
    });

    if (calendarOrigin) {
      return buildCalendarOriginReturnHref(calendarOrigin);
    }
  }

  if (from === "bookings") {
    return "/bookings";
  }

  if (from === "events") {
    return "/events";
  }

  if (from === "discover") {
    return "/dm";
  }

  if (from === "profile") {
    const profileUserId = context.profileUserId?.trim();

    if (profileUserId) {
      return `/profile/${profileUserId}`;
    }

    return "/dm";
  }

  if (context.tab === "group") {
    return "/dm?tab=group";
  }

  return "/dm";
}

export function buildDmThreadHref(
  conversationId: string,
  options?: { from?: string; tab?: string; bookingRequestId?: string },
): string {
  const params = new URLSearchParams();

  if (options?.from?.trim()) {
    params.set("from", options.from.trim());
  }

  if (options?.tab?.trim()) {
    params.set("tab", options.tab.trim());
  }

  if (options?.bookingRequestId?.trim()) {
    params.set("bookingRequestId", options.bookingRequestId.trim());
  }

  const query = params.toString();

  return query ? `/dm/${conversationId}?${query}` : `/dm/${conversationId}`;
}
