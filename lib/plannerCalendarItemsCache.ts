import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import type { CalendarItem } from "@/lib/calendar";

const PLANNER_CALENDAR_ITEMS_CACHE_KEY = "ftc-planner-calendar-items-v2";
const PLANNER_CALENDAR_ITEMS_LOCAL_CACHE_KEY = "ftc-planner-calendar-items-v2-local";

type PlannerCalendarItemsCachePayload = {
  userId: string;
  items: CalendarItem[];
  updatedAt: number;
};

function parsePlannerCalendarItemsCachePayload(raw: string): CalendarItem[] | null {
  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerCalendarItemsCachePayload>;
    if (parsed.userId !== userId || !Array.isArray(parsed.items)) {
      return null;
    }

    return parsed.items as CalendarItem[];
  } catch (cacheError) {
    console.error("[planner-calendar] Failed to parse items cache:", cacheError);
    return null;
  }
}

function readLocalPlannerCalendarItemsCache(): CalendarItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PLANNER_CALENDAR_ITEMS_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  return parsePlannerCalendarItemsCachePayload(raw);
}

/** Returns cached planner calendar items for the current user, otherwise null. */
export function readPlannerCalendarItemsCache(): CalendarItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PLANNER_CALENDAR_ITEMS_CACHE_KEY);
    if (raw) {
      const sessionItems = parsePlannerCalendarItemsCachePayload(raw);
      if (sessionItems) {
        return sessionItems;
      }
    }
  } catch (cacheError) {
    console.error("[planner-calendar] Failed to read session items cache:", cacheError);
  }

  return readLocalPlannerCalendarItemsCache();
}

export function writePlannerCalendarItemsCache(items: CalendarItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return;
  }

  const payload: PlannerCalendarItemsCachePayload = {
    userId,
    items,
    updatedAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(PLANNER_CALENDAR_ITEMS_CACHE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(PLANNER_CALENDAR_ITEMS_LOCAL_CACHE_KEY, JSON.stringify(payload));
  } catch (cacheError) {
    console.error("[planner-calendar] Failed to write items cache:", cacheError);
  }
}
