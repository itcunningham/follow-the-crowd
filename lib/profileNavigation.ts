import type { CalendarOriginState } from "@/lib/bookings/gigsCalendarNavigation";
import { resolveCalendarOriginEventHref } from "@/lib/bookings/gigsCalendarNavigation";
import { parseCalendarOriginReturnParams } from "@/lib/calendar";
import { getDefaultRouteForRole, type UserRole } from "@/lib/user/currentUser";
import { looksLikeUserId } from "@/lib/user/displayName";

export type EventDetailProfileReturnContext = {
  eventId: string;
  fromTab?: string | null;
  calendarOrigin?: CalendarOriginState | null;
};

function resolveValidatedEventDetailHref(eventId: string | null | undefined): string | null {
  const trimmedEventId = eventId?.trim();

  if (!trimmedEventId || !looksLikeUserId(trimmedEventId)) {
    return null;
  }

  return `/events/${trimmedEventId}`;
}

export function buildEventDetailReturnHref(
  context: EventDetailProfileReturnContext,
): string | null {
  const baseHref = resolveValidatedEventDetailHref(context.eventId);

  if (!baseHref) {
    return null;
  }

  if (context.calendarOrigin) {
    return resolveCalendarOriginEventHref(baseHref, context.calendarOrigin);
  }

  if (context.fromTab?.trim() === "history") {
    return `${baseHref}?fromTab=history`;
  }

  return baseHref;
}

export function buildEventDetailProfileHref(
  userId: string,
  context: EventDetailProfileReturnContext,
): string {
  const params = new URLSearchParams({
    from: "event-detail",
    eventId: context.eventId.trim(),
  });

  if (context.fromTab?.trim() === "history") {
    params.set("fromTab", "history");
  }

  if (context.calendarOrigin) {
    params.set("calendarDate", context.calendarOrigin.calendarDate);
    params.set("calendarView", context.calendarOrigin.calendarView);
    params.set("calendarMonth", context.calendarOrigin.calendarMonth);
  }

  return `/profile/${userId}?${params.toString()}`;
}

export function readProfileEventDetailContext(
  getParam: (key: string) => string | null,
): EventDetailProfileReturnContext | null {
  if (getParam("from")?.trim() !== "event-detail") {
    return null;
  }

  const eventId = getParam("eventId")?.trim();

  if (!eventId || !looksLikeUserId(eventId)) {
    return null;
  }

  return {
    eventId,
    fromTab: getParam("fromTab"),
    calendarOrigin: parseCalendarOriginReturnParams(
      getParam("calendarDate"),
      getParam("calendarView"),
      getParam("calendarMonth"),
    ),
  };
}

export function buildProfileDmThreadHref(
  conversationId: string,
  profileUserId: string,
  eventDetailContext?: EventDetailProfileReturnContext | null,
  chatReturnTo?: string | null,
): string {
  const params = new URLSearchParams({
    from: "profile",
    profileUserId: profileUserId.trim(),
  });

  if (eventDetailContext) {
    params.set("profileFrom", "event-detail");
    params.set("eventId", eventDetailContext.eventId.trim());

    if (eventDetailContext.fromTab?.trim() === "history") {
      params.set("fromTab", "history");
    }

    if (eventDetailContext.calendarOrigin) {
      params.set("calendarDate", eventDetailContext.calendarOrigin.calendarDate);
      params.set("calendarView", eventDetailContext.calendarOrigin.calendarView);
      params.set("calendarMonth", eventDetailContext.calendarOrigin.calendarMonth);
    }
  } else {
    // Preserve crew-chat / DM returnTo so Profile ← DM keeps Back + Message CTA context.
    const trimmedReturnTo = chatReturnTo?.trim();
    if (
      trimmedReturnTo &&
      trimmedReturnTo.startsWith("/") &&
      !trimmedReturnTo.startsWith("//") &&
      !trimmedReturnTo.startsWith("/profile/")
    ) {
      params.set("profileFrom", "chat");
      params.set("profileReturnTo", trimmedReturnTo);
    }
  }

  const query = params.toString();

  return query ? `/dm/${conversationId}?${query}` : `/dm/${conversationId}`;
}

export function buildProfileHref(
  userId: string,
  options?: { returnTo?: string | null },
): string {
  const base = `/profile/${userId}`;
  const returnTo = options?.returnTo?.trim();

  if (!returnTo) {
    return base;
  }

  const params = new URLSearchParams({
    from: "chat",
    returnTo,
  });

  return `${base}?${params.toString()}`;
}

export function resolveProfileEventDetailBackNavigation(
  from: string | null | undefined,
  options: {
    eventId?: string | null;
    fromTab?: string | null;
    calendarDate?: string | null;
    calendarView?: string | null;
    calendarMonth?: string | null;
  },
): { href: string; label: string } | null {
  if (from?.trim() !== "event-detail") {
    return null;
  }

  const calendarOrigin = parseCalendarOriginReturnParams(
    options.calendarDate,
    options.calendarView,
    options.calendarMonth,
  );

  const href = buildEventDetailReturnHref({
    eventId: options.eventId ?? "",
    fromTab: options.fromTab,
    calendarOrigin,
  });

  if (!href) {
    return null;
  }

  return { href, label: "Back to event" };
}

export function resolveProfileBackNavigation(
  returnTo: string | null | undefined,
  role: UserRole | null,
): { href: string; label: string } {
  const fallbackHref = getDefaultRouteForRole(role);
  const fallbackLabel = role === "dj" ? "Back to Gigs" : "Back to Events";
  const trimmed = returnTo?.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  if (trimmed.startsWith("/profile/")) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  return { href: trimmed, label: "Back to chat" };
}

export function buildChatReturnTo(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;

  return query ? `${pathname}?${query}` : pathname;
}

export function resolveProfileChatBackNavigation(
  from: string | null | undefined,
  returnTo: string | null | undefined,
): { href: string; label: string } | null {
  if (from?.trim() !== "chat") {
    return null;
  }

  const trimmed = returnTo?.trim();

  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/profile/")
  ) {
    return null;
  }

  return { href: trimmed, label: "Back to chat" };
}

const DM_CONVERSATION_RETURN_TO_PATTERN = /^\/dm\/([^/?#]+)/;
const CREW_CHAT_RETURN_TO_PATTERN = /^\/events\/[^/]+\/chat(?:\?|$)/;

export function readDmConversationIdFromReturnTo(
  returnTo: string | null | undefined,
): string | null {
  const trimmed = returnTo?.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(DM_CONVERSATION_RETURN_TO_PATTERN);
  return match?.[1] ?? null;
}

/** Profile opened from an active DM thread — hide redundant bottom message CTA. */
export function isProfileOpenedFromDmConversation(
  from: string | null | undefined,
  returnTo: string | null | undefined,
): boolean {
  if (from?.trim() !== "chat") {
    return false;
  }

  return readDmConversationIdFromReturnTo(returnTo) !== null;
}

/** Profile opened from an event crew chat — already booked into that night. */
export function isProfileOpenedFromCrewChat(
  from: string | null | undefined,
  returnTo: string | null | undefined,
): boolean {
  if (from?.trim() !== "chat") {
    return false;
  }

  const trimmed = returnTo?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return false;
  }

  return CREW_CHAT_RETURN_TO_PATTERN.test(trimmed);
}
