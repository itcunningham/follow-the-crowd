import {
  filterDjGigsByTab,
  type BookingRequest,
  type DjGigsListTab,
} from "@/lib/bookingRequests";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

export type GigsListSessionState = {
  received: BookingRequest[];
  hiddenBookingIds: ReadonlySet<string>;
  senderProfiles: Map<string, BookingRecipientProfile>;
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
}): void {
  const tabBookings = buildTabBookings(options.received, options.hiddenBookingIds);
  const previousProfiles = sessionState?.senderProfiles ?? new Map<string, BookingRecipientProfile>();

  sessionState = {
    received: options.received,
    hiddenBookingIds: options.hiddenBookingIds,
    senderProfiles: options.senderProfiles ?? previousProfiles,
    tabBookings,
  };
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
}
