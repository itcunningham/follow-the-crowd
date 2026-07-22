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
