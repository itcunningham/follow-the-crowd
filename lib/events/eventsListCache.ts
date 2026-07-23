import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import type { EventWithLineupStats } from "@/lib/events";
import { seedEventOwnerIdsFromEvents } from "@/lib/events/eventOwnerIdCache";

const EVENTS_LIST_CACHE_KEY = "ftc-events-list-v1";
const EVENTS_LIST_LOCAL_CACHE_KEY = "ftc-events-list-v1-local";

type EventsListLocalCache = {
  userId: string;
  isPlanner: boolean;
  events: EventWithLineupStats[];
  updatedAt: number;
};

function getEventsCacheKey(isPlanner: boolean): string {
  return `${EVENTS_LIST_CACHE_KEY}:${isPlanner ? "planner" : "dj"}`;
}

function getEventsLocalCacheKey(isPlanner: boolean): string {
  return `${EVENTS_LIST_LOCAL_CACHE_KEY}:${isPlanner ? "planner" : "dj"}`;
}

function readLocalEventsListCache(isPlanner: boolean): EventWithLineupStats[] {
  if (typeof window === "undefined") {
    return [];
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getEventsLocalCacheKey(isPlanner));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<EventsListLocalCache>;
    if (
      parsed.userId !== userId ||
      parsed.isPlanner !== isPlanner ||
      !Array.isArray(parsed.events)
    ) {
      return [];
    }

    return parsed.events as EventWithLineupStats[];
  } catch (cacheError) {
    console.error("[events] Failed to read local events cache:", cacheError);
    return [];
  }
}

function writeLocalEventsListCache(isPlanner: boolean, events: EventWithLineupStats[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getEventsLocalCacheKey(isPlanner),
      JSON.stringify({
        userId,
        isPlanner,
        events,
        updatedAt: Date.now(),
      } satisfies EventsListLocalCache),
    );
  } catch (cacheError) {
    console.error("[events] Failed to write local events cache:", cacheError);
  }
}

export function readEventsListCache(isPlanner: boolean): EventWithLineupStats[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(getEventsCacheKey(isPlanner));

    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      const events = Array.isArray(parsed) ? (parsed as EventWithLineupStats[]) : [];

      if (events.length > 0) {
        return events;
      }
    }
  } catch (cacheError) {
    console.error("[events] Failed to read events cache:", cacheError);
  }

  return readLocalEventsListCache(isPlanner);
}

/** Hydrate list UI from session/local cache (stale-while-revalidate on tab return). */
export function seedEventsListStateFromCache(isPlanner: boolean): {
  events: EventWithLineupStats[];
  loadingEvents: boolean;
  eventsListReady: boolean;
} {
  const events = readEventsListCache(isPlanner);

  if (events.length > 0) {
    seedEventOwnerIdsFromEvents(events);
    return { events, loadingEvents: false, eventsListReady: true };
  }

  return { events: [], loadingEvents: true, eventsListReady: false };
}

export function writeEventsListCache(isPlanner: boolean, events: EventWithLineupStats[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getEventsCacheKey(isPlanner), JSON.stringify(events));
    writeLocalEventsListCache(isPlanner, events);
    seedEventOwnerIdsFromEvents(events);
  } catch (cacheError) {
    console.error("[events] Failed to write events cache:", cacheError);
  }
}

export function readCachedEventOwnerId(eventId: string): string | null | undefined {
  if (!eventId.trim()) {
    return undefined;
  }

  for (const isPlanner of [true, false] as const) {
    const cachedEvent = readEventsListCache(isPlanner).find((event) => event.id === eventId);

    if (!cachedEvent) {
      continue;
    }

    const ownerId = cachedEvent.owner_id;

    if (typeof ownerId !== "string" || !ownerId.trim()) {
      continue;
    }

    return ownerId.trim();
  }

  return undefined;
}
