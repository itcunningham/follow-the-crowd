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

function isBookingsContextualReturnLocation(
  locationPathname: string,
  locationSearch: string | null | undefined,
): boolean {
  const params = new URLSearchParams(
    locationSearch?.startsWith("?") ? locationSearch.slice(1) : (locationSearch ?? ""),
  );

  return params.get("from") === "bookings";
}

/**
 * Gigs list tab for /bookings — never inherit Events (or other workspace) `?tab=`.
 * Browser URL on /bookings is authoritative. During cross-workspace navigation, only
 * trust Next searchParams when the browser is still on a bookings contextual return
 * screen (Event Details / DM with `from=bookings`).
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

  if (locationOnBookings) {
    return resolveGigsListTabParam(null, null, options.locationSearch ?? "");
  }

  if (locationPathname != null && !locationOnBookings) {
    if (
      options.searchParamsTab != null &&
      isBookingsContextualReturnLocation(locationPathname, options.locationSearch)
    ) {
      return parseDjGigsListTab(options.searchParamsTab);
    }

    return "pending";
  }

  if (options.searchParamsTab != null) {
    return parseDjGigsListTab(options.searchParamsTab);
  }

  return "pending";
}

/** Ensures browser Back from Event Details returns to the active Gigs sub-tab. */
export function ensureGigsListTabInBrowserHistory(tab: DjGigsListTab): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!isBookingsGigsListPathname(window.location.pathname)) {
    return;
  }

  const currentTab = resolveGigsListTabParam(null, null, window.location.search);

  if (currentTab === tab) {
    return;
  }

  window.history.replaceState(window.history.state, "", buildGigsListHref(tab));
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
