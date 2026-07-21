import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import type { BookingPlan } from "@/lib/bookingPlans";

const BOOKING_PLANS_LIST_CACHE_KEY = "ftc-booking-plans-list-v1";
const BOOKING_PLANS_LIST_LOCAL_CACHE_KEY = "ftc-booking-plans-list-v1-local";

type BookingPlansListCachePayload = {
  userId: string;
  plans: BookingPlan[];
  updatedAt: number;
};

function parseBookingPlansListCachePayload(raw: string): BookingPlan[] | null {
  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BookingPlansListCachePayload>;
    if (parsed.userId !== userId || !Array.isArray(parsed.plans)) {
      return null;
    }

    return parsed.plans as BookingPlan[];
  } catch (cacheError) {
    console.error("[booking-plans] Failed to parse plans cache:", cacheError);
    return null;
  }
}

function readLocalBookingPlansListCache(): BookingPlan[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(BOOKING_PLANS_LIST_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  return parseBookingPlansListCachePayload(raw);
}

/** Returns cached plans when present for the current user, otherwise null. */
export function readBookingPlansListCache(): BookingPlan[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(BOOKING_PLANS_LIST_CACHE_KEY);
    if (raw) {
      const sessionPlans = parseBookingPlansListCachePayload(raw);
      if (sessionPlans) {
        return sessionPlans;
      }
    }
  } catch (cacheError) {
    console.error("[booking-plans] Failed to read session plans cache:", cacheError);
  }

  return readLocalBookingPlansListCache();
}

export function writeBookingPlansListCache(plans: BookingPlan[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return;
  }

  const payload: BookingPlansListCachePayload = {
    userId,
    plans,
    updatedAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(BOOKING_PLANS_LIST_CACHE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(BOOKING_PLANS_LIST_LOCAL_CACHE_KEY, JSON.stringify(payload));
  } catch (cacheError) {
    console.error("[booking-plans] Failed to write plans cache:", cacheError);
  }
}
