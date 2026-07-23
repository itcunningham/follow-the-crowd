import type { DjGigsListTab } from "@/lib/bookingRequests";

let pendingGigsListTab: DjGigsListTab | null = null;
const listeners = new Set<() => void>();

function notifyGigsListTabPendingListeners(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeGigsListTabPending(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readGigsListTabPending(): DjGigsListTab | null {
  return pendingGigsListTab;
}

export function publishGigsListTabPending(tab: DjGigsListTab | null): void {
  pendingGigsListTab = tab;
  notifyGigsListTabPendingListeners();
}

/** Clear optimistic selection once the route tab matches the pending target. */
export function syncGigsListTabPendingWithRoute(routeTab: DjGigsListTab): void {
  if (pendingGigsListTab != null && pendingGigsListTab === routeTab) {
    publishGigsListTabPending(null);
  }
}

export function clearGigsListTabPending(): void {
  publishGigsListTabPending(null);
}

export function resolveDisplayedGigsListTab(routeTab: DjGigsListTab): DjGigsListTab {
  return pendingGigsListTab ?? routeTab;
}
