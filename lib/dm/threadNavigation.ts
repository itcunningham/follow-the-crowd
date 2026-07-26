import type { CalendarOriginState } from "@/lib/bookings/gigsCalendarNavigation";
import {
  buildGigsListHref,
  parseDjGigsListTab,
} from "@/lib/bookings/gigsListNavigation";
import {
  buildCalendarOriginReturnHref,
  parseCalendarOriginFromEventDetail,
  parseCalendarOriginReturnParams,
  resolveCalendarOriginEventHref,
} from "@/lib/calendar";
import { DM_BOOKING_FOCUS_SCROLL_ONLY } from "@/lib/dm/chatBookingTarget";
import { buildEventDetailProfileHref } from "@/lib/profileNavigation";
import { looksLikeUserId } from "@/lib/user/displayName";

export type DmThreadEntryContext = {
  from: string;
  tab?: string | null;
  calendarDate?: string | null;
  calendarView?: string | null;
  calendarMonth?: string | null;
  profileUserId?: string | null;
};

const DM_THREAD_ENTRY_FROM_VALUES = new Set([
  "bookings",
  "calendar",
  "events",
  "profile",
]);

export function parseDmThreadEntryContext(
  getParam: (key: string) => string | null,
): DmThreadEntryContext | null {
  const from = getParam("from")?.trim();

  if (!from || !DM_THREAD_ENTRY_FROM_VALUES.has(from)) {
    return null;
  }

  return {
    from,
    tab: getParam("tab"),
    calendarDate: getParam("calendarDate"),
    calendarView: getParam("calendarView"),
    calendarMonth: getParam("calendarMonth"),
    profileUserId: getParam("profileUserId"),
  };
}

export function appendDmReturnContextToEventDetailParams(
  params: URLSearchParams,
  entryContext: DmThreadEntryContext | null | undefined,
): void {
  const entryFrom = entryContext?.from?.trim();

  if (!entryFrom || !DM_THREAD_ENTRY_FROM_VALUES.has(entryFrom)) {
    return;
  }

  params.set("dmReturnFrom", entryFrom);

  if (entryFrom === "bookings") {
    const tab = entryContext?.tab?.trim();

    if (tab) {
      params.set("tab", tab);
    }

    return;
  }

  if (entryFrom === "calendar") {
    if (entryContext?.calendarDate?.trim()) {
      params.set("calendarDate", entryContext.calendarDate.trim());
    }

    if (
      entryContext?.calendarView === "event" ||
      entryContext?.calendarView === "dj"
    ) {
      params.set("calendarView", entryContext.calendarView);
    }

    if (entryContext?.calendarMonth?.trim()) {
      params.set("calendarMonth", entryContext.calendarMonth.trim());
    }

    return;
  }

  if (entryFrom === "profile") {
    const profileUserId = entryContext?.profileUserId?.trim();

    if (profileUserId) {
      params.set("profileUserId", profileUserId);
    }
  }
}

export function resolveDmThreadHrefOptionsFromEventDetailReturn(options: {
  dmReturnFrom?: string | null;
  tab?: string | null;
  calendarDate?: string | null;
  calendarView?: string | null;
  calendarMonth?: string | null;
  profileUserId?: string | null;
  bookingRequestId?: string | null;
}): {
  from?: string;
  tab?: string;
  calendarDate?: string;
  calendarView?: CalendarOriginState["calendarView"];
  calendarMonth?: string;
  profileUserId?: string;
  bookingRequestId?: string;
  bookingFocus?: typeof DM_BOOKING_FOCUS_SCROLL_ONLY;
} {
  const dmReturnFrom = options.dmReturnFrom?.trim();
  const bookingRequestId = options.bookingRequestId?.trim();

  if (!dmReturnFrom || !DM_THREAD_ENTRY_FROM_VALUES.has(dmReturnFrom)) {
    return {
      bookingRequestId: bookingRequestId || undefined,
      bookingFocus: bookingRequestId ? DM_BOOKING_FOCUS_SCROLL_ONLY : undefined,
    };
  }

  const hrefOptions: {
    from?: string;
    tab?: string;
    calendarDate?: string;
    calendarView?: CalendarOriginState["calendarView"];
    calendarMonth?: string;
    profileUserId?: string;
    bookingRequestId?: string;
    bookingFocus?: typeof DM_BOOKING_FOCUS_SCROLL_ONLY;
  } = {
    from: dmReturnFrom,
    bookingRequestId: bookingRequestId || undefined,
  };

  if (dmReturnFrom === "bookings") {
    const tab = options.tab?.trim();

    if (tab) {
      hrefOptions.tab = tab;
    }
  }

  if (dmReturnFrom === "calendar") {
    if (options.calendarDate?.trim()) {
      hrefOptions.calendarDate = options.calendarDate.trim();
    }

    if (options.calendarView === "event" || options.calendarView === "dj") {
      hrefOptions.calendarView = options.calendarView;
    }

    if (options.calendarMonth?.trim()) {
      hrefOptions.calendarMonth = options.calendarMonth.trim();
    }
  }

  if (dmReturnFrom === "profile") {
    const profileUserId = options.profileUserId?.trim();

    if (profileUserId) {
      hrefOptions.profileUserId = profileUserId;
    }
  }

  return hrefOptions;
}

export type DmThreadBackContext = {
  from?: string | null;
  tab?: string | null;
  profileUserId?: string | null;
  profileFrom?: string | null;
  fromTab?: string | null;
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
    const tab = parseDjGigsListTab(context.tab);

    if (tab === "pending") {
      return "/bookings";
    }

    return buildGigsListHref(tab);
  }

  if (from === "events") {
    return "/events";
  }

  if (from === "discover") {
    return "/dm";
  }

  if (from === "profile") {
    const profileUserId = context.profileUserId?.trim();

    if (!profileUserId) {
      return "/dm";
    }

    if (context.profileFrom?.trim() === "event-detail") {
      const calendarOrigin = parseCalendarOriginReturnParams(
        context.calendarDate,
        context.calendarView,
        context.calendarMonth,
      );
      const eventId = context.eventId?.trim();

      if (eventId && looksLikeUserId(eventId)) {
        return buildEventDetailProfileHref(profileUserId, {
          eventId,
          fromTab: context.fromTab,
          calendarOrigin,
        });
      }
    }

    return `/profile/${profileUserId}`;
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
    profileUserId?: string;
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

  if (options?.profileUserId?.trim()) {
    params.set("profileUserId", options.profileUserId.trim());
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
