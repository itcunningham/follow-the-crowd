import { listBookingPlans } from "@/lib/bookingPlans";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import {
  readBookingPlansListCache,
  writeBookingPlansListCache,
} from "@/lib/bookingPlans/bookingPlansListCache";

let inFlightPrefetch: Promise<void> | null = null;
let inFlightUserId: string | null = null;

/** Warms the Event Plans list cache while the user is elsewhere in the workspace. */
export function ensureBookingPlansListPrefetched(): Promise<void> {
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
  inFlightPrefetch = listBookingPlans(userId)
    .then((rows) => {
      writeBookingPlansListCache(rows);
    })
    .catch((error) => {
      if (readBookingPlansListCache() === null) {
        console.error("[booking-plans] Failed to prefetch event plans list:", error);
      }
    })
    .finally(() => {
      inFlightPrefetch = null;
      inFlightUserId = null;
    });

  return inFlightPrefetch;
}
