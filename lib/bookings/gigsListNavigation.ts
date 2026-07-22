import type { DjGigsListTab } from "@/lib/bookingRequests";

const GIGS_LIST_TABS: DjGigsListTab[] = ["pending", "accepted", "history"];

export function parseDjGigsListTab(value: string | null | undefined): DjGigsListTab {
  if (value === "accepted" || value === "confirmed" || value === "history") {
    return value === "history" ? "history" : "accepted";
  }

  if (value === "declined") {
    return "history";
  }

  if (value === "calendar") {
    return "pending";
  }

  return "pending";
}

export function isBookingsGigsListPathname(pathname: string): boolean {
  return pathname === "/bookings" || pathname.startsWith("/bookings/");
}

export function resolveGigsListTabParam(
  searchParamsTab: string | null | undefined,
  initialTab?: string | null,
  locationSearch?: string | null,
): DjGigsListTab {
  if (locationSearch != null) {
    const locationTab = new URLSearchParams(
      locationSearch.startsWith("?") ? locationSearch.slice(1) : locationSearch,
    ).get("tab");

    if (locationTab != null) {
      return parseDjGigsListTab(locationTab);
    }

    return "pending";
  }

  if (searchParamsTab != null) {
    return parseDjGigsListTab(searchParamsTab);
  }

  return parseDjGigsListTab(initialTab);
}

/**
 * Gigs list tab for /bookings — never inherit Events (or other workspace) `?tab=`.
 * During cross-workspace navigation, Next pathname can be /bookings while the browser
 * URL is still /events?tab=history; ignore tab until the browser is on /bookings.
 */
export function resolveGigsListTabForBookingsPage(options: {
  nextPathname: string;
  searchParamsTab: string | null;
  locationPathname?: string | null;
  locationSearch?: string | null;
}): DjGigsListTab {
  if (!isBookingsGigsListPathname(options.nextPathname)) {
    return "pending";
  }

  const locationPathname = options.locationPathname ?? null;
  const locationOnBookings =
    locationPathname != null && isBookingsGigsListPathname(locationPathname);

  if (locationOnBookings && options.locationSearch != null) {
    return resolveGigsListTabParam(null, null, options.locationSearch);
  }

  if (locationPathname != null && !locationOnBookings) {
    return "pending";
  }

  if (options.searchParamsTab != null) {
    return parseDjGigsListTab(options.searchParamsTab);
  }

  return "pending";
}

/** Top workspace Gigs tab: Incoming with no inherited Events query params. */
export function buildGigsWorkspaceIncomingHref(): string {
  return "/bookings";
}

export function buildGigsListHref(tab: DjGigsListTab = "pending"): string {
  return `/bookings?tab=${tab}`;
}

export function buildGigsEventDetailHref(
  eventId: string,
  tab: DjGigsListTab = "pending",
): string {
  if (tab === "pending") {
    return `/events/${eventId}?from=bookings`;
  }

  return `/events/${eventId}?from=bookings&tab=${tab}`;
}

export function buildGigsConversationHref(
  conversationId: string,
  bookingRequestId: string,
  gigsTab: DjGigsListTab = "pending",
): string {
  const params = new URLSearchParams({
    from: "bookings",
    bookingRequestId,
  });

  if (gigsTab !== "pending") {
    params.set("tab", gigsTab);
  }

  return `/dm/${conversationId}?${params.toString()}`;
}

export function resolveGigsEventDetailBackHref(
  from: string | null | undefined,
  tab: string | null | undefined,
): string | null {
  if (from !== "bookings") {
    return null;
  }

  return buildGigsListHref(parseDjGigsListTab(tab));
}
