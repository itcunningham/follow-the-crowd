import { loadNavigationBadgeData } from "@/lib/navigationBadges";
import {
  readNavigationBadgeCache,
  readRuntimeBadgeFetchedAt,
  writeNavigationBadgeCache,
  writeRuntimeBadgeFetchedAt,
  writeRuntimeNavBadgeSnapshot,
} from "@/lib/navigationBadgeCache";
import { readCachedNavigation } from "@/lib/navigationRoleCache";
import type { UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_REFRESH_INTERVAL_MS = 20_000;

type PrefetchIdentity = {
  userId: string;
  role: UserRole;
};

let inFlightPrefetch: Promise<void> | null = null;
let inFlightIdentity: PrefetchIdentity | null = null;
let cacheVersion = 0;
const listeners = new Set<() => void>();

function identityKey(userId: string, role: UserRole): string {
  return `${userId}:${role}`;
}

function notifyNavigationBadgeListeners(): void {
  cacheVersion += 1;
  listeners.forEach((listener) => listener());
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
  writeRuntimeNavBadgeSnapshot({
    ...cache,
    badgesReady: true,
    reserveBadgeSpace: false,
    reserveGigsBadgeSpace: false,
  });
  writeRuntimeBadgeFetchedAt(updatedAt);
  notifyNavigationBadgeListeners();
}

export function getNavigationBadgeCacheVersion(): number {
  return cacheVersion;
}

export function subscribeNavigationBadgeListeners(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
  const resolvedUserId = userId ?? cachedNav.userId;
  const resolvedRole = role ?? cachedNav.role;

  if (!resolvedUserId || !resolvedRole) {
    return Promise.resolve();
  }

  const hasCache = Boolean(readNavigationBadgeCache(resolvedUserId, resolvedRole));
  const fetchedAt = readRuntimeBadgeFetchedAt();
  const isFresh = Date.now() - fetchedAt < NAV_BADGE_REFRESH_INTERVAL_MS;

  if (!options?.force && hasCache && isFresh) {
    return Promise.resolve();
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

  return inFlightPrefetch;
}

if (typeof window !== "undefined") {
  void ensureNavigationBadgesPrefetched();
}
