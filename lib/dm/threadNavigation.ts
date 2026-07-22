import type { CalendarOriginState } from "@/lib/bookings/gigsCalendarNavigation";
import {
  buildCalendarOriginReturnHref,
  parseCalendarOriginFromEventDetail,
  parseCalendarOriginReturnParams,
  resolveCalendarOriginEventHref,
} from "@/lib/calendar";
import { DM_BOOKING_FOCUS_SCROLL_ONLY } from "@/lib/dm/chatBookingTarget";
import { looksLikeUserId } from "@/lib/user/displayName";

export type DmThreadBackContext = {
  from?: string | null;
  tab?: string | null;
  profileUserId?: string | null;
  eventId?: string | null;
  calendarDate?: string | null;
  calendarView?: string | null;
  calendarMonth?: string | null;
};

function resolveValidatedEventDetailBackHref(eventId: string | null | undefined): string | null {
  const trimmedEventId = eventId?.trim();

  if (!trimmedEventId || !looksLikeUserId(trimmedEventId)) {
    return null;
  }

  return `/events/${trimmedEventId}`;
}

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

  if (from === "event-detail") {
    const eventHref = resolveValidatedEventDetailBackHref(context.eventId);

    if (!eventHref) {
      return "/events";
    }

    const calendarOrigin = parseCalendarOriginReturnParams(
      context.calendarDate,
      context.calendarView,
      context.calendarMonth,
    );

    if (calendarOrigin) {
      return resolveCalendarOriginEventHref(eventHref, calendarOrigin);
    }

    return eventHref;
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
  options?: {
    from?: string;
    tab?: string;
    eventId?: string;
    bookingRequestId?: string;
    bookingFocus?: typeof DM_BOOKING_FOCUS_SCROLL_ONLY;
    calendarDate?: string;
    calendarView?: CalendarOriginState["calendarView"];
    calendarMonth?: string;
  },
): string {
  const params = new URLSearchParams();

  if (options?.from?.trim()) {
    params.set("from", options.from.trim());
  }

  if (options?.tab?.trim()) {
    params.set("tab", options.tab.trim());
  }

  if (options?.eventId?.trim() && looksLikeUserId(options.eventId)) {
    params.set("eventId", options.eventId.trim());
  }

  if (options?.bookingRequestId?.trim()) {
    params.set("bookingRequestId", options.bookingRequestId.trim());
  }

  if (options?.bookingFocus === DM_BOOKING_FOCUS_SCROLL_ONLY) {
    params.set("bookingFocus", DM_BOOKING_FOCUS_SCROLL_ONLY);
  }

  if (options?.calendarDate?.trim()) {
    params.set("calendarDate", options.calendarDate.trim());
  }

  if (options?.calendarView === "event" || options?.calendarView === "dj") {
    params.set("calendarView", options.calendarView);
  }

  if (options?.calendarMonth?.trim()) {
    params.set("calendarMonth", options.calendarMonth.trim());
  }

  const query = params.toString();

  return query ? `/dm/${conversationId}?${query}` : `/dm/${conversationId}`;
}

export function buildEventDetailDmThreadHref(
  conversationId: string,
  eventId: string,
  calendarOrigin?: CalendarOriginState | null,
): string {
  return buildDmThreadHref(conversationId, {
    from: "event-detail",
    eventId,
    calendarDate: calendarOrigin?.calendarDate,
    calendarView: calendarOrigin?.calendarView,
    calendarMonth: calendarOrigin?.calendarMonth,
  });
}
