import type { Event } from "@/lib/events";
import { readEventsListCache } from "@/lib/events/eventsListCache";

/** Reuse list-row event data for instant Event Details hero/title/meta while fetching fresh detail. */
export function readCachedEventSummaryById(eventId: string): Event | null {
  if (!eventId.trim()) {
    return null;
  }

  for (const isPlanner of [true, false] as const) {
    const cached = readEventsListCache(isPlanner).find((event) => event.id === eventId);

    if (cached) {
      return cached;
    }
  }

  return null;
}
