import { buildGigsListHref, parseDjGigsListTab } from "@/lib/bookings/gigsListNavigation";

export type EventsListTab = "active" | "history";

export type EventsListView = "active" | "cancelled";

export function parseEventsListTab(value: string | null | undefined): EventsListTab {
  return value === "history" ? "history" : "active";
}

export function resolveEventsListTabParam(
  searchParamsTab: string | null | undefined,
  initialTab?: string | null,
  locationSearch?: string | null,
): EventsListTab {
  if (searchParamsTab != null) {
    return parseEventsListTab(searchParamsTab);
  }

  const locationTab =
    locationSearch != null
      ? new URLSearchParams(
          locationSearch.startsWith("?") ? locationSearch.slice(1) : locationSearch,
        ).get("tab")
      : null;

  if (locationTab != null) {
    return parseEventsListTab(locationTab);
  }

  if (locationSearch != null) {
    return "active";
  }

  return parseEventsListTab(initialTab);
}

export function eventsListViewFromTab(tab: EventsListTab): EventsListView {
  return tab === "history" ? "cancelled" : "active";
}

export function eventsListTabFromView(view: EventsListView): EventsListTab {
  return view === "cancelled" ? "history" : "active";
}

export function buildEventsListHref(tab: EventsListTab = "active"): string {
  return tab === "history" ? "/events?tab=history" : "/events";
}

export function buildEventDetailHref(eventId: string, tab: EventsListTab = "active"): string {
  if (tab === "history") {
    return `/events/${eventId}?fromTab=history`;
  }

  return `/events/${eventId}`;
}

export function resolveEventDetailBackHref(
  fromTab: string | null | undefined,
  options?: {
    from?: string | null;
    tab?: string | null;
  },
): string {
  if (options?.from === "bookings") {
    return buildGigsListHref(parseDjGigsListTab(options.tab ?? fromTab));
  }

  return buildEventsListHref(parseEventsListTab(fromTab));
}
