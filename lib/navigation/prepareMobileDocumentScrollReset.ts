export const CALENDAR_AGENDA_EVENT_NAV_STORAGE_KEY = "ftc:calendar-agenda-event-nav";
export const EVENTS_LIST_EVENT_NAV_STORAGE_KEY = "ftc:events-list-event-nav";

export function prepareMobileDocumentScrollReset(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  window.history.scrollRestoration = "manual";
}

export function prepareCalendarAgendaEventNavigation(): void {
  prepareMobileDocumentScrollReset();
  sessionStorage.setItem(CALENDAR_AGENDA_EVENT_NAV_STORAGE_KEY, "1");
}

export function prepareEventsListEventNavigation(): void {
  prepareMobileDocumentScrollReset();
  sessionStorage.setItem(EVENTS_LIST_EVENT_NAV_STORAGE_KEY, "1");
}
