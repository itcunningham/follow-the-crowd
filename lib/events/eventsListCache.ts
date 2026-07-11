import type { EventWithLineupStats } from "@/lib/events";

const EVENTS_LIST_CACHE_KEY = "ftc-events-list-v1";

function getEventsCacheKey(isPlanner: boolean): string {
  return `${EVENTS_LIST_CACHE_KEY}:${isPlanner ? "planner" : "dj"}`;
}

export function readEventsListCache(isPlanner: boolean): EventWithLineupStats[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(getEventsCacheKey(isPlanner));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? (parsed as EventWithLineupStats[]) : [];
  } catch (cacheError) {
    console.error("[events] Failed to read events cache:", cacheError);
    return [];
  }
}

export function writeEventsListCache(isPlanner: boolean, events: EventWithLineupStats[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getEventsCacheKey(isPlanner), JSON.stringify(events));
  } catch (cacheError) {
    console.error("[events] Failed to write events cache:", cacheError);
  }
}
