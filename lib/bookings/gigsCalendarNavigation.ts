export type CalendarOriginView = "event" | "dj";

export type CalendarOriginState = {
  calendarDate: string;
  calendarView: CalendarOriginView;
  calendarMonth: string;
};

const LINKED_EVENT_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export type PlannerCalendarItemNavigationSource = {
  id: string;
  type: "event" | "sent_booking" | "received_booking";
  href: string;
  eventId?: string | null;
};

export function resolvePlannerCalendarItemEventId(
  item: PlannerCalendarItemNavigationSource,
): string | null {
  const explicitEventId = item.eventId?.trim();

  if (explicitEventId && LINKED_EVENT_ID_PATTERN.test(explicitEventId)) {
    return explicitEventId;
  }

  if (item.type === "event" && item.id.startsWith("event-")) {
    const fromItemId = item.id.slice("event-".length);

    if (LINKED_EVENT_ID_PATTERN.test(fromItemId)) {
      return fromItemId;
    }
  }

  if (item.href.startsWith("/events/")) {
    const fromHref = item.href.slice("/events/".length).split("?")[0]?.trim();

    if (fromHref && LINKED_EVENT_ID_PATTERN.test(fromHref)) {
      return fromHref;
    }
  }

  return null;
}

export function resolveCalendarOriginEventHref(
  href: string,
  origin: CalendarOriginState,
): string {
  if (!href.startsWith("/events/")) {
    return href;
  }

  const eventId = href.slice("/events/".length).split("?")[0];

  if (!eventId) {
    return href;
  }

  const params = new URLSearchParams({
    from: "calendar",
    calendarDate: origin.calendarDate,
    calendarView: origin.calendarView,
    calendarMonth: origin.calendarMonth,
  });

  return `/events/${eventId}?${params.toString()}`;
}

export function resolvePlannerCalendarItemHref(
  item: PlannerCalendarItemNavigationSource,
  origin: CalendarOriginState,
): string | null {
  const eventId = resolvePlannerCalendarItemEventId(item);

  if (eventId) {
    return resolveCalendarOriginEventHref(`/events/${eventId}`, origin);
  }

  if (item.href.startsWith("/events/")) {
    return resolveCalendarOriginEventHref(item.href, origin);
  }

  return null;
}

export function resolveCalendarOriginBookingHref(
  href: string,
  origin: CalendarOriginState,
): string {
  if (href.startsWith("/events/")) {
    return resolveCalendarOriginEventHref(href, origin);
  }

  if (!href.startsWith("/dm/")) {
    return href;
  }

  const [path, existingQuery = ""] = href.split("?");
  const conversationId = path.slice("/dm/".length);

  if (!conversationId) {
    return href;
  }

  const params = new URLSearchParams(existingQuery);
  params.set("from", "calendar");
  params.set("calendarDate", origin.calendarDate);
  params.set("calendarView", origin.calendarView);
  params.set("calendarMonth", origin.calendarMonth);

  return `/dm/${conversationId}?${params.toString()}`;
}

export type GigsCalendarBookingNavigationResult =
  | { kind: "event"; href: string; eventId: string }
  | { kind: "dm"; href: string }
  | { kind: "error"; message: string };

function isValidLinkedEventId(eventId: string | null | undefined): eventId is string {
  const trimmed = eventId?.trim();

  return Boolean(trimmed && /^[0-9a-f-]{36}$/i.test(trimmed));
}

export function resolveGigsCalendarBookingNavigation(
  booking: {
    id: string;
    status: string;
    event_id: string | null;
    conversation_id: string;
  },
  origin: CalendarOriginState,
): GigsCalendarBookingNavigationResult {
  if (booking.status === "accepted") {
    const rawEventId = booking.event_id?.trim() ?? "";

    if (!isValidLinkedEventId(booking.event_id)) {
      return {
        kind: "error",
        message: rawEventId
          ? "This booked gig is missing a valid linked event."
          : "This booked gig has no linked event yet. Open the conversation to finish setup.",
      };
    }

    const baseHref = `/events/${booking.event_id.trim()}`;

    return {
      kind: "event",
      eventId: booking.event_id.trim(),
      href: resolveCalendarOriginBookingHref(baseHref, origin),
    };
  }

  const conversationId = booking.conversation_id.trim();

  if (!conversationId) {
    return {
      kind: "error",
      message: "This booking request is missing its conversation.",
    };
  }

  return {
    kind: "dm",
    href: resolveCalendarOriginBookingHref(
      `/dm/${conversationId}?bookingRequestId=${encodeURIComponent(booking.id)}`,
      origin,
    ),
  };
}
