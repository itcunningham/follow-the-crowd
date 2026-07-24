import {
  filterDjGigsByTab,
  type BookingRequest,
  type DjGigsListTab,
} from "@/lib/bookingRequests";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

export type GigsEventArtworkSnapshot = {
  coverImageUrl: string | null;
  fallbackColour: string | null;
};

export type GigsListSessionState = {
  received: BookingRequest[];
  hiddenBookingIds: ReadonlySet<string>;
  senderProfiles: Map<string, BookingRecipientProfile>;
  eventArtworkById: Map<string, GigsEventArtworkSnapshot>;
  tabBookings: Record<DjGigsListTab, BookingRequest[]>;
};

let sessionState: GigsListSessionState | null = null;

function buildTabBookings(
  received: BookingRequest[],
  hiddenBookingIds: ReadonlySet<string>,
): Record<DjGigsListTab, BookingRequest[]> {
  return {
    pending: filterDjGigsByTab(received, "pending", hiddenBookingIds),
    accepted: filterDjGigsByTab(received, "accepted", hiddenBookingIds),
    history: filterDjGigsByTab(received, "history", hiddenBookingIds),
  };
}

/** Persists last successful gigs list data across tab navigations and page remounts. */
export function writeGigsListSessionState(options: {
  received: BookingRequest[];
  hiddenBookingIds: ReadonlySet<string>;
  senderProfiles?: Map<string, BookingRecipientProfile>;
  eventArtworkById?: Map<string, GigsEventArtworkSnapshot>;
}): void {
  const tabBookings = buildTabBookings(options.received, options.hiddenBookingIds);
  const previousProfiles = sessionState?.senderProfiles ?? new Map<string, BookingRecipientProfile>();
  const previousArtwork =
    sessionState?.eventArtworkById ?? new Map<string, GigsEventArtworkSnapshot>();

  sessionState = {
    received: options.received,
    hiddenBookingIds: options.hiddenBookingIds,
    senderProfiles: options.senderProfiles ?? previousProfiles,
    eventArtworkById: options.eventArtworkById ?? previousArtwork,
    tabBookings,
  };

  if (options.senderProfiles && options.senderProfiles.size > 0) {
    seedGigsSenderProfilesMemoryCache(options.senderProfiles);
  }

  if (options.eventArtworkById && options.eventArtworkById.size > 0) {
    seedGigsEventArtworkMemoryCache(options.eventArtworkById);
  }
}

export function writeGigsListSessionSenderProfiles(
  senderProfiles: Map<string, BookingRecipientProfile>,
): void {
  if (!sessionState) {
    return;
  }

  sessionState = {
    ...sessionState,
    senderProfiles,
  };
}

let memorySenderProfiles = new Map<string, BookingRecipientProfile>();

/** Retains previously loaded planner names across gigs list refreshes. */
export function mergeGigsSenderProfiles(
  fresh: Map<string, BookingRecipientProfile>,
): Map<string, BookingRecipientProfile> {
  if (fresh.size > 0) {
    memorySenderProfiles = new Map([...memorySenderProfiles, ...fresh]);
  }

  return new Map(memorySenderProfiles);
}

export function seedGigsSenderProfilesMemoryCache(
  senderProfiles: Map<string, BookingRecipientProfile>,
): void {
  if (senderProfiles.size === 0) {
    return;
  }

  memorySenderProfiles = new Map([...memorySenderProfiles, ...senderProfiles]);
}

export function readGigsSenderProfilesMemoryCache(): Map<string, BookingRecipientProfile> {
  return new Map(memorySenderProfiles);
}

let memoryEventArtworkById = new Map<string, GigsEventArtworkSnapshot>();

/** Retains previously loaded event artwork across gigs list refreshes. */
export function mergeGigsEventArtwork(
  fresh: Map<string, GigsEventArtworkSnapshot>,
): Map<string, GigsEventArtworkSnapshot> {
  if (fresh.size > 0) {
    memoryEventArtworkById = new Map([...memoryEventArtworkById, ...fresh]);
  }

  return new Map(memoryEventArtworkById);
}

export function seedGigsEventArtworkMemoryCache(
  eventArtworkById: Map<string, GigsEventArtworkSnapshot>,
): void {
  if (eventArtworkById.size === 0) {
    return;
  }

  memoryEventArtworkById = new Map([...memoryEventArtworkById, ...eventArtworkById]);
}

export function readGigsEventArtworkMemoryCache(): Map<string, GigsEventArtworkSnapshot> {
  return new Map(memoryEventArtworkById);
}

export function readGigsListSessionState(): GigsListSessionState | null {
  return sessionState;
}

export function readGigsTabBookingsCache(tab: DjGigsListTab): BookingRequest[] | null {
  if (!sessionState) {
    return null;
  }

  return sessionState.tabBookings[tab];
}

export function hasGigsTabBookingsCache(tab: DjGigsListTab): boolean {
  return sessionState != null && sessionState.tabBookings[tab] != null;
}

export function clearGigsListTabBookingsCacheForTests(): void {
  sessionState = null;
  memorySenderProfiles = new Map();
  memoryEventArtworkById = new Map();
}
