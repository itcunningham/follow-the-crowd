import { buildGigsListHref, parseDjGigsListTab } from "@/lib/bookings/gigsListNavigation";
import { buildPlannerCalendarHref, resolveCalendarOriginDateKey } from "@/lib/calendar";
import { sanitizePrefilledEventDateKey } from "@/lib/bookingDateTime";
import { EVENTS_AREA_SUB_NAV } from "@/lib/plannerEventsNav";

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

export type CalendarOriginCreateParam = "calendar" | "calendar-plans";

export function isCalendarOriginCreateParam(
  create: string | null | undefined,
): create is CalendarOriginCreateParam {
  return create === "calendar" || create === "calendar-plans";
}

export function resolveCalendarCreateReturnHref(eventDate: string | null | undefined): string {
  const originDateKey = resolveCalendarOriginDateKey(eventDate);
  return originDateKey ? buildPlannerCalendarHref(originDateKey) : "/calendar";
}

export function resolveCalendarCreateInitialStep(
  create: string | null | undefined,
): "form" | "pick-plan" {
  return create === "calendar-plans" ? "pick-plan" : "form";
}

export type CalendarCreateBootstrapState = {
  createOpen: true;
  calendarOriginDateKey: string | null;
  createStep: "form" | "pick-plan";
  prefilledEventDate: string;
};

export function resolveCalendarCreateBootstrapState(
  create: string | null | undefined,
  eventDate: string | null | undefined,
): CalendarCreateBootstrapState | null {
  if (!isCalendarOriginCreateParam(create)) {
    return null;
  }

  const calendarOriginDateKey = resolveCalendarOriginDateKey(eventDate);
  const prefilledEventDate =
    calendarOriginDateKey ?? sanitizePrefilledEventDateKey(eventDate ?? "");

  return {
    createOpen: true,
    calendarOriginDateKey,
    createStep: resolveCalendarCreateInitialStep(create),
    prefilledEventDate,
  };
}

export function isCalendarOriginEventsFlow(
  calendarOriginDateKey: string | null | undefined,
  createParam: string | null | undefined,
): boolean {
  return Boolean(calendarOriginDateKey) || isCalendarOriginCreateParam(createParam);
}

export function resolveEventsWorkspaceActiveHref(
  calendarOriginDateKey: string | null | undefined,
  createParam: string | null | undefined,
): string | undefined {
  return isCalendarOriginEventsFlow(calendarOriginDateKey, createParam)
    ? EVENTS_AREA_SUB_NAV.calendar.href
    : undefined;
}

export function resolveCalendarSaveReturnDateKey(
  calendarOriginDateKey: string | null | undefined,
  formEventDate: string,
  isCalendarCreateFlow: boolean,
): string | null {
  if (!isCalendarCreateFlow) {
    return null;
  }

  return calendarOriginDateKey ?? resolveCalendarOriginDateKey(formEventDate);
}
