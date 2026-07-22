import { loadPlannerCalendarItems } from "@/lib/calendar";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import {
  readPlannerCalendarItemsCache,
  writePlannerCalendarItemsCache,
} from "@/lib/plannerCalendarItemsCache";

let inFlightPrefetch: Promise<void> | null = null;
let inFlightUserId: string | null = null;

/** Warms the Events Calendar item cache while the user is elsewhere in the workspace. */
export function ensurePlannerCalendarItemsPrefetched(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return Promise.resolve();
  }

  if (inFlightPrefetch && inFlightUserId === userId) {
    return inFlightPrefetch;
  }

  inFlightUserId = userId;
  inFlightPrefetch = loadPlannerCalendarItems()
    .then((items) => {
      writePlannerCalendarItemsCache(items);
    })
    .catch((error) => {
      if (readPlannerCalendarItemsCache() === null) {
        console.error("[planner-calendar] Failed to prefetch calendar items:", error);
      }
    })
    .finally(() => {
      inFlightPrefetch = null;
      inFlightUserId = null;
    });

  return inFlightPrefetch;
}
