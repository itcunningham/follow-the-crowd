import type { DjGigsViewFilter } from "@/lib/bookingRequests";

const GIGS_LIST_TABS: DjGigsViewFilter[] = [
  "pending",
  "accepted",
  "declined",
  "history",
  "calendar",
];

export function parseGigsListTab(value: string | null | undefined): DjGigsViewFilter {
  if (value && GIGS_LIST_TABS.includes(value as DjGigsViewFilter)) {
    return value as DjGigsViewFilter;
  }

  return "pending";
}

export function resolveGigsListTabParam(
  searchParamsTab: string | null | undefined,
  initialTab?: string | null,
  locationSearch?: string | null,
): DjGigsViewFilter {
  const locationTab = locationSearch
    ? new URLSearchParams(locationSearch).get("tab")
    : null;

  return parseGigsListTab(searchParamsTab ?? locationTab ?? initialTab);
}

export function buildGigsListHref(tab: DjGigsViewFilter = "pending"): string {
  return tab === "pending" ? "/bookings" : `/bookings?tab=${tab}`;
}

export function buildGigsEventDetailHref(
  eventId: string,
  tab: DjGigsViewFilter = "pending",
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

  return buildGigsListHref(parseGigsListTab(tab));
}
