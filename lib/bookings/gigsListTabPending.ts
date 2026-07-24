import type { DjGigsListTab } from "@/lib/bookingRequests";

let pendingGigsListTab: DjGigsListTab | null = null;
const listeners = new Set<() => void>();
let gigsListRouteRevision = 0;
const routeRevisionListeners = new Set<() => void>();

function notifyGigsListTabPendingListeners(): void {
  listeners.forEach((listener) => listener());
}

function notifyGigsListRouteRevisionListeners(): void {
  routeRevisionListeners.forEach((listener) => listener());
}

export function subscribeGigsListRouteRevision(listener: () => void): () => void {
  routeRevisionListeners.add(listener);
  return () => routeRevisionListeners.delete(listener);
}

export function readGigsListRouteRevision(): number {
  return gigsListRouteRevision;
}

/** Re-read `window.location` after client `pushState` tab switches (Next searchParams lag). */
export function bumpGigsListRouteRevision(): void {
  gigsListRouteRevision += 1;
  notifyGigsListRouteRevisionListeners();
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
    return;
  }

  if (routeTab === "pending" && pendingGigsListTab != null && pendingGigsListTab !== "pending") {
    publishGigsListTabPending(null);
  }
}

export function clearGigsListTabPending(): void {
  publishGigsListTabPending(null);
}

export function resolveDisplayedGigsListTab(routeTab: DjGigsListTab): DjGigsListTab {
  if (routeTab === "pending" && pendingGigsListTab != null && pendingGigsListTab !== "pending") {
    return "pending";
  }

  return pendingGigsListTab ?? routeTab;
}
