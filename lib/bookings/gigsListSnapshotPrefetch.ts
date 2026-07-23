import {
  countDjGigsByTab,
  listBookingRequestHistoryHideIds,
  listReceivedBookingRequests,
  type BookingRequest,
} from "@/lib/bookingRequests";
import {
  writeGigsTabCountsCache,
  type GigsTabCountsSnapshot,
} from "@/lib/bookings/gigsTabCountsCache";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import type { UserRole } from "@/lib/user/currentUser";

export type GigsListSnapshot = {
  received: BookingRequest[];
  hiddenBookingIds: ReadonlySet<string>;
  counts: GigsTabCountsSnapshot;
};

let memorySnapshot: GigsListSnapshot | null = null;
let inFlightSnapshot: Promise<GigsListSnapshot> | null = null;

function buildSnapshot(
  received: BookingRequest[],
  hiddenIds: string[],
): GigsListSnapshot {
  const hiddenBookingIds = new Set(hiddenIds);
  const counts = countDjGigsByTab(received, hiddenBookingIds);

  return {
    received,
    hiddenBookingIds,
    counts,
  };
}

async function fetchGigsListSnapshot(): Promise<GigsListSnapshot> {
  const [received, hiddenIds] = await Promise.all([
    listReceivedBookingRequests(),
    listBookingRequestHistoryHideIds(),
  ]);

  const snapshot = buildSnapshot(received, hiddenIds);
  memorySnapshot = snapshot;
  writeGigsTabCountsCache(snapshot.counts);
  return snapshot;
}

/** Warms Gigs tab counts while the user is elsewhere in the workspace. */
export function ensureGigsListSnapshotPrefetched(
  role?: UserRole | null,
  options?: { force?: boolean },
): Promise<GigsListSnapshot | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (role != null && !canViewGigsSubNav(role)) {
    return Promise.resolve(null);
  }

  if (!options?.force && memorySnapshot) {
    return Promise.resolve(memorySnapshot);
  }

  if (!options?.force && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  inFlightSnapshot = fetchGigsListSnapshot()
    .catch((error) => {
      console.error("[gigs-list] Failed to prefetch gigs list snapshot:", error);
      throw error;
    })
    .finally(() => {
      inFlightSnapshot = null;
    });

  return inFlightSnapshot;
}

/** Single shared list fetch for the bookings page and workspace prefetch. */
export function loadGigsListSnapshot(options?: { force?: boolean }): Promise<GigsListSnapshot> {
  if (!options?.force && memorySnapshot) {
    return Promise.resolve(memorySnapshot);
  }

  if (!options?.force && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  inFlightSnapshot = fetchGigsListSnapshot().finally(() => {
    inFlightSnapshot = null;
  });

  return inFlightSnapshot;
}

export function clearGigsListSnapshotPrefetchForTests(): void {
  memorySnapshot = null;
  inFlightSnapshot = null;
}
