import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import type { BookingRequest } from "@/lib/bookingRequests";
import type { DjAvailabilityEntry } from "@/lib/djAvailability";

const DJ_GIGS_CALENDAR_CACHE_KEY = "ftc-dj-gigs-calendar-v1";
const DJ_GIGS_CALENDAR_LOCAL_CACHE_KEY = "ftc-dj-gigs-calendar-v1-local";

export type DjGigsCalendarCacheSnapshot = {
  entries: DjAvailabilityEntry[];
  bookings: BookingRequest[];
};

type DjGigsCalendarCachePayload = DjGigsCalendarCacheSnapshot & {
  userId: string;
  updatedAt: number;
};

function parseDjGigsCalendarCachePayload(raw: string): DjGigsCalendarCacheSnapshot | null {
  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DjGigsCalendarCachePayload>;
    if (
      parsed.userId !== userId ||
      !Array.isArray(parsed.entries) ||
      !Array.isArray(parsed.bookings)
    ) {
      return null;
    }

    return {
      entries: parsed.entries as DjAvailabilityEntry[],
      bookings: parsed.bookings as BookingRequest[],
    };
  } catch (cacheError) {
    console.error("[dj-gigs-calendar] Failed to parse cache:", cacheError);
    return null;
  }
}

function readLocalDjGigsCalendarCache(): DjGigsCalendarCacheSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(DJ_GIGS_CALENDAR_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  return parseDjGigsCalendarCachePayload(raw);
}

export function readDjGigsCalendarCache(): DjGigsCalendarCacheSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(DJ_GIGS_CALENDAR_CACHE_KEY);
    if (raw) {
      const sessionSnapshot = parseDjGigsCalendarCachePayload(raw);
      if (sessionSnapshot) {
        return sessionSnapshot;
      }
    }
  } catch (cacheError) {
    console.error("[dj-gigs-calendar] Failed to read session cache:", cacheError);
  }

  return readLocalDjGigsCalendarCache();
}

export function writeDjGigsCalendarCache(snapshot: DjGigsCalendarCacheSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return;
  }

  const payload: DjGigsCalendarCachePayload = {
    userId,
    entries: snapshot.entries,
    bookings: snapshot.bookings,
    updatedAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(DJ_GIGS_CALENDAR_CACHE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(DJ_GIGS_CALENDAR_LOCAL_CACHE_KEY, JSON.stringify(payload));
  } catch (cacheError) {
    console.error("[dj-gigs-calendar] Failed to write cache:", cacheError);
  }
}
