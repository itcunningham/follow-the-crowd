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
import {
  clearGigsListTabBookingsCacheForTests,
  mergeGigsEventArtwork,
  mergeGigsSenderProfiles,
  type GigsEventArtworkSnapshot,
  writeGigsListSessionState,
} from "@/lib/bookings/gigsListTabBookingsCache";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import { getEventArtworkByIds } from "@/lib/events";
import {
  getBookingRecipientProfilesByIds,
  type BookingRecipientProfile,
} from "@/lib/user/currentUser";
import type { UserRole } from "@/lib/user/currentUser";

export type GigsListSnapshot = {
  received: BookingRequest[];
  hiddenBookingIds: ReadonlySet<string>;
  counts: GigsTabCountsSnapshot;
  senderProfiles: Map<string, BookingRecipientProfile>;
  eventArtworkById: Map<string, GigsEventArtworkSnapshot>;
};

let memorySnapshot: GigsListSnapshot | null = null;
let inFlightSnapshot: Promise<GigsListSnapshot> | null = null;

function buildSnapshot(
  received: BookingRequest[],
  hiddenIds: string[],
  senderProfiles: Map<string, BookingRecipientProfile>,
  eventArtworkById: Map<string, GigsEventArtworkSnapshot>,
): GigsListSnapshot {
  const hiddenBookingIds = new Set(hiddenIds);
  const counts = countDjGigsByTab(received, hiddenBookingIds);

  const snapshot = {
    received,
    hiddenBookingIds,
    counts,
    senderProfiles,
    eventArtworkById,
  };

  writeGigsListSessionState({
    received,
    hiddenBookingIds,
    senderProfiles,
    eventArtworkById,
  });

  return snapshot;
}

async function loadGigsSenderProfiles(
  received: BookingRequest[],
): Promise<Map<string, BookingRecipientProfile>> {
  const senderIds = [...new Set(received.map((booking) => booking.sender_id).filter(Boolean))];

  if (senderIds.length === 0) {
    return mergeGigsSenderProfiles(new Map());
  }

  try {
    const freshProfiles = await getBookingRecipientProfilesByIds(senderIds);
    return mergeGigsSenderProfiles(freshProfiles);
  } catch (error) {
    console.error("[gigs-list] Failed to load gig sender profiles:", error);
    return mergeGigsSenderProfiles(new Map());
  }
}

type GigsEventLookup = {
  artworkById: Map<string, GigsEventArtworkSnapshot>;
  cancelledEventIds: ReadonlySet<string>;
};

async function loadGigsEventLookup(received: BookingRequest[]): Promise<GigsEventLookup> {
  const eventIds = [
    ...new Set(
      received
        .map((booking) => booking.event_id)
        .filter((eventId): eventId is string => Boolean(eventId)),
    ),
  ];

  if (eventIds.length === 0) {
    return { artworkById: mergeGigsEventArtwork(new Map()), cancelledEventIds: new Set() };
  }

  try {
    const freshArtwork = await getEventArtworkByIds(eventIds);
    const mapped = new Map<string, GigsEventArtworkSnapshot>();
    const cancelledEventIds = new Set<string>();

    for (const [eventId, artwork] of freshArtwork) {
      mapped.set(eventId, {
        coverImageUrl: artwork.coverImageUrl,
        fallbackColour: artwork.fallbackColour,
      });

      if (artwork.status === "cancelled") {
        cancelledEventIds.add(eventId);
      }
    }

    return { artworkById: mergeGigsEventArtwork(mapped), cancelledEventIds };
  } catch (error) {
    console.error("[gigs-list] Failed to load gig event details:", error);
    return { artworkById: mergeGigsEventArtwork(new Map()), cancelledEventIds: new Set() };
  }
}

/**
 * Surfaces planner-cancelled events on accepted gigs.
 *
 * `cancel_event` only cancels *pending* booking_requests, so a DJ's accepted
 * booking keeps `status = 'accepted'` after the planner cancels the event. The
 * gigs list reads booking_requests alone and would otherwise keep showing that
 * gig under Confirmed as though it were still going ahead — the DJ Events tab
 * used to be the one place this was visible, via the event's own status.
 *
 * The event rows are already being fetched here for cover artwork, so this
 * costs no extra request: an accepted booking on a cancelled event is presented
 * as cancelled, which routes it to History with the cancelled badge and drops
 * it from the Confirmed count, through the existing filters. Pending bookings
 * are left alone — the database already cancels those.
 */
export function applyCancelledEventStatus(
  received: BookingRequest[],
  cancelledEventIds: ReadonlySet<string>,
): BookingRequest[] {
  if (cancelledEventIds.size === 0) {
    return received;
  }

  return received.map((booking) =>
    booking.status === "accepted" && booking.event_id && cancelledEventIds.has(booking.event_id)
      ? { ...booking, status: "cancelled" as const }
      : booking,
  );
}

async function fetchGigsListSnapshot(): Promise<GigsListSnapshot> {
  const receivedPromise = listReceivedBookingRequests();
  const hiddenIdsPromise = listBookingRequestHistoryHideIds();
  const received = await receivedPromise;
  const [hiddenIds, senderProfiles, eventLookup] = await Promise.all([
    hiddenIdsPromise,
    loadGigsSenderProfiles(received),
    loadGigsEventLookup(received),
  ]);

  const snapshot = buildSnapshot(
    applyCancelledEventStatus(received, eventLookup.cancelledEventIds),
    hiddenIds,
    senderProfiles,
    eventLookup.artworkById,
  );
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

export function readGigsListMemorySnapshot(): GigsListSnapshot | null {
  return memorySnapshot;
}

export function clearGigsListSnapshotPrefetchForTests(): void {
  memorySnapshot = null;
  inFlightSnapshot = null;
  clearGigsListTabBookingsCacheForTests();
}
