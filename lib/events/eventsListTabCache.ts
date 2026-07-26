import type { EventsListTab } from "@/lib/events/eventsListNavigation";

const EVENTS_LIST_TAB_CACHE_KEY = "ftc:events-list-tab";

function parseTabParam(value: string): EventsListTab {
  return value === "history" ? "history" : "active";
}

export function writeEventsListTabCache(tab: EventsListTab): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(EVENTS_LIST_TAB_CACHE_KEY, tab);
  } catch (cacheError) {
    console.error("[events] Failed to write events list tab cache:", cacheError);
  }
}

export function readEventsListTabCache(): EventsListTab | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = window.sessionStorage.getItem(EVENTS_LIST_TAB_CACHE_KEY);

    if (cached === "history" || cached === "active") {
      return cached;
    }
  } catch (cacheError) {
    console.error("[events] Failed to read events list tab cache:", cacheError);
  }

  return null;
}

export function readEventsListTabFromLocationSearch(
  search: string | null | undefined,
): EventsListTab | null {
  if (search == null) {
    return null;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tab = params.get("tab");

  if (tab == null) {
    return null;
  }

  return parseTabParam(tab);
}
