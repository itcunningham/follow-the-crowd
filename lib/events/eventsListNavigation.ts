export type EventsListTab = "active" | "history";

export type EventsListView = "active" | "cancelled";

export function parseEventsListTab(value: string | null | undefined): EventsListTab {
  return value === "history" ? "history" : "active";
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

export function resolveEventDetailBackHref(fromTab: string | null | undefined): string {
  return buildEventsListHref(parseEventsListTab(fromTab));
}
