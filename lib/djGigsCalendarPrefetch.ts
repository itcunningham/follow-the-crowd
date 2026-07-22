import { listMyActiveReceivedBookings } from "@/lib/bookingRequests";
import { listMyAvailabilityEntries } from "@/lib/djAvailability";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import {
  readDjGigsCalendarCache,
  writeDjGigsCalendarCache,
} from "@/lib/djGigsCalendarCache";

let inFlightPrefetch: Promise<void> | null = null;
let inFlightUserId: string | null = null;

/** Warms the Gigs Calendar cache while the user is elsewhere in the workspace. */
export function ensureDjGigsCalendarPrefetched(): Promise<void> {
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
  inFlightPrefetch = Promise.all([
    listMyAvailabilityEntries(),
    listMyActiveReceivedBookings(),
  ])
    .then(([entries, bookings]) => {
      writeDjGigsCalendarCache({ entries, bookings });
    })
    .catch((error) => {
      if (readDjGigsCalendarCache() === null) {
        console.error("[dj-gigs-calendar] Failed to prefetch calendar data:", error);
      }
    })
    .finally(() => {
      inFlightPrefetch = null;
      inFlightUserId = null;
    });

  return inFlightPrefetch;
}
