import type { EventsListTab } from "@/lib/events/eventsListNavigation";

const EVENTS_LIST_TAB_CACHE_KEY = "ftc:events-list-tab";

function parseTabParam(value: string): EventsListTab {
  return value === "history" ? "history" : "active";
}

/** @deprecated Tab selection is URL-driven; clears legacy session cache on workspace leave. */
export function clearEventsListTabCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(EVENTS_LIST_TAB_CACHE_KEY);
  } catch (cacheError) {
    console.error("[events] Failed to clear events list tab cache:", cacheError);
  }
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
