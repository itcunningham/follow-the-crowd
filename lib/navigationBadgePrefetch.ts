import { countPendingIncomingGigs } from "@/lib/bookingRequests";
import {
  applyPersistedGigsPendingCount,
  getCachedGigsPendingCount,
  readLocalGigsPendingCache,
  readNavigationBadgeCache,
  readRuntimeBadgeFetchedAt,
  writeNavigationBadgeCache,
  writeRuntimeBadgeFetchedAt,
  writeRuntimeGigsPendingCount,
  writeRuntimeNavBadgeSnapshot,
} from "@/lib/navigationBadgeCache";
import { loadNavigationBadgeData } from "@/lib/navigationBadges";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import { readCachedNavigation, readCachedNavRole } from "@/lib/navigationRoleCache";
import { getCurrentUserId, type UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_REFRESH_INTERVAL_MS = 20_000;
const GIGS_PENDING_REFRESH_INTERVAL_MS = 20_000;

type PrefetchIdentity = {
  userId: string;
  role: UserRole;
};

let inFlightPrefetch: Promise<void> | null = null;
let inFlightIdentity: PrefetchIdentity | null = null;
let gigsInFlight: Promise<number> | null = null;
let gigsInFlightRole: UserRole | null = null;
let gigsLastFetchedAt = 0;
let cacheVersion = 0;
const listeners = new Set<() => void>();

function identityKey(userId: string, role: UserRole): string {
  return `${userId}:${role}`;
}

function notifyNavigationBadgeListeners(): void {
  cacheVersion += 1;
  listeners.forEach((listener) => listener());
}

function seedGigsPendingFromPersistentStorage(): void {
  const { userId, role } = readCachedNavigation();

  if (!role || !canViewGigsSubNav(role)) {
    return;
  }

  const localCache = readLocalGigsPendingCache(userId, role);
  if (localCache) {
    writeRuntimeGigsPendingCount(localCache.userId, localCache.role, localCache.count);
    return;
  }

  const cachedCount = getCachedGigsPendingCount(userId, role);
  if (cachedCount != null && userId) {
    applyPersistedGigsPendingCount(userId, role, cachedCount);
  }
}

function applyPrefetchedBadgeData(
  userId: string,
  role: UserRole,
  data: Awaited<ReturnType<typeof loadNavigationBadgeData>>,
): void {
  const updatedAt = Date.now();
  const cache = {
    userId,
    role,
    messages: data.messages,
    bookings: data.bookings,
    gigsPending: data.gigsPending,
    updatedAt,
  };

  writeNavigationBadgeCache(cache);
  applyPersistedGigsPendingCount(userId, role, data.gigsPending);
  writeRuntimeNavBadgeSnapshot({
    ...cache,
    badgesReady: true,
    reserveBadgeSpace: false,
    reserveGigsBadgeSpace: false,
  });
  writeRuntimeBadgeFetchedAt(updatedAt);
  gigsLastFetchedAt = updatedAt;
  notifyNavigationBadgeListeners();
}

async function resolvePrefetchUserId(userId?: string | null): Promise<string | null> {
  if (userId?.trim()) {
    return userId;
  }

  const cachedUserId = readCachedNavigation().userId;
  if (cachedUserId) {
    return cachedUserId;
  }

  try {
    return await getCurrentUserId();
  } catch {
    return null;
  }
}

export function getNavigationBadgeCacheVersion(): number {
  return cacheVersion;
}

export function subscribeNavigationBadgeListeners(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ensureGigsPendingPrefetched(
  role?: UserRole | null,
  options?: { force?: boolean },
): Promise<number> {
  if (typeof window === "undefined") {
    return Promise.resolve(0);
  }

  const resolvedRole = role ?? readCachedNavigation().role;
  if (!resolvedRole || !canViewGigsSubNav(resolvedRole)) {
    return Promise.resolve(0);
  }

  const { userId } = readCachedNavigation();
  const cachedCount = getCachedGigsPendingCount(userId, resolvedRole);
  const isFresh = Date.now() - gigsLastFetchedAt < GIGS_PENDING_REFRESH_INTERVAL_MS;

  if (cachedCount != null && !options?.force && isFresh) {
    return Promise.resolve(cachedCount);
  }

  if (
    !options?.force &&
    gigsInFlight &&
    gigsInFlightRole === resolvedRole
  ) {
    return gigsInFlight;
  }

  gigsInFlightRole = resolvedRole;
  gigsInFlight = (async () => {
    try {
      const count = await countPendingIncomingGigs();
      const resolvedUserId = await resolvePrefetchUserId(userId);

      if (resolvedUserId) {
        applyPersistedGigsPendingCount(resolvedUserId, resolvedRole, count);
        gigsLastFetchedAt = Date.now();
        notifyNavigationBadgeListeners();
      }

      return count;
    } catch (error) {
      console.error("[navigationBadgePrefetch] Failed to prefetch gigs pending count:", error);
      return cachedCount ?? 0;
    } finally {
      gigsInFlight = null;
      gigsInFlightRole = null;
    }
  })();

  return gigsInFlight;
}

export function ensureNavigationBadgesPrefetched(
  userId?: string | null,
  role?: UserRole | null,
  options?: { force?: boolean },
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const cachedNav = readCachedNavigation();
  const resolvedRole = role ?? cachedNav.role;

  if (resolvedRole && canViewGigsSubNav(resolvedRole)) {
    void ensureGigsPendingPrefetched(resolvedRole, options);
  }

  return (async () => {
    const resolvedUserId = await resolvePrefetchUserId(userId ?? cachedNav.userId);
    if (!resolvedUserId || !resolvedRole) {
      return;
    }

    const hasCache = Boolean(readNavigationBadgeCache(resolvedUserId, resolvedRole));
    const fetchedAt = readRuntimeBadgeFetchedAt();
    const isFresh = Date.now() - fetchedAt < NAV_BADGE_REFRESH_INTERVAL_MS;

    if (!options?.force && hasCache && isFresh) {
      return;
    }

    if (
      !options?.force &&
      inFlightPrefetch &&
      inFlightIdentity &&
      identityKey(inFlightIdentity.userId, inFlightIdentity.role) ===
        identityKey(resolvedUserId, resolvedRole)
    ) {
      return inFlightPrefetch;
    }

    inFlightIdentity = { userId: resolvedUserId, role: resolvedRole };

    inFlightPrefetch = loadNavigationBadgeData(resolvedUserId, resolvedRole)
      .then((data) => {
        applyPrefetchedBadgeData(resolvedUserId, resolvedRole, data);
      })
      .catch((error) => {
        console.error("[navigationBadgePrefetch] Failed to prefetch navigation badges:", error);
      })
      .finally(() => {
        inFlightPrefetch = null;
      });

    await inFlightPrefetch;
  })();
}

if (typeof window !== "undefined") {
  seedGigsPendingFromPersistentStorage();

  const role = readCachedNavRole();
  if (canViewGigsSubNav(role)) {
    void ensureGigsPendingPrefetched(role);
  }

  void ensureNavigationBadgesPrefetched();
}
