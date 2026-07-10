import type { DjGigsListTab } from "@/lib/bookingRequests";

const GIGS_LIST_TABS: DjGigsListTab[] = ["pending", "accepted", "history"];

export function parseDjGigsListTab(value: string | null | undefined): DjGigsListTab {
  if (value === "accepted" || value === "history") {
    return value;
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
  if (searchParamsTab != null) {
    return parseDjGigsListTab(searchParamsTab);
  }

  const locationTab =
    locationSearch != null
      ? new URLSearchParams(
          locationSearch.startsWith("?") ? locationSearch.slice(1) : locationSearch,
        ).get("tab")
      : null;

  if (locationTab != null) {
    return parseDjGigsListTab(locationTab);
  }

  if (locationSearch != null) {
    return "pending";
  }

  return parseDjGigsListTab(initialTab);
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

export function resolveGigsEventDetailBackHref(
  from: string | null | undefined,
  tab: string | null | undefined,
): string | null {
  if (from !== "bookings") {
    return null;
  }

  return buildGigsListHref(parseDjGigsListTab(tab));
}
