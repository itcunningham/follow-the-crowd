import { countPendingIncomingGigs } from "@/lib/bookingRequests";
import {
  applyPersistedGigsPendingCount,
  applyPersistedMessagesUnreadCount,
  getCachedGigsPendingCount,
  getCachedNavMessagesCount,
  readLocalGigsPendingCache,
  readLocalMessagesUnreadCache,
  readLocalNavigationBadgeCache,
  readNavigationBadgeCache,
  resolveNavigationBadgeCache,
  readRuntimeBadgeFetchedAt,
  writeNavigationBadgeCache,
  writeRuntimeBadgeFetchedAt,
  writeRuntimeGigsPendingCount,
  writeRuntimeMessagesUnreadCount,
  writeRuntimeNavBadgeSnapshot,
} from "@/lib/navigationBadgeCache";
import { loadNavigationBadgeData } from "@/lib/navigationBadges";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import { readCachedNavigation, readCachedNavRole } from "@/lib/navigationRoleCache";
import { getNavBadgeCounts, type NavBadgeCounts } from "@/lib/notifications";
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
let messagesInFlight: Promise<NavBadgeCounts | null> | null = null;
let messagesInFlightIdentity: PrefetchIdentity | null = null;
let messagesLastFetchedAt = 0;
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

function seedMessagesUnreadFromPersistentStorage(): void {
  const { userId, role } = readCachedNavigation();

  if (!role) {
    return;
  }

  const localCache = readLocalMessagesUnreadCache(userId, role);
  if (localCache) {
    writeRuntimeMessagesUnreadCount(localCache.userId, localCache.role, localCache.count);
    return;
  }

  const navLocalCache = readLocalNavigationBadgeCache(userId, role);
  if (navLocalCache && userId) {
    applyPersistedMessagesUnreadCount(userId, role, navLocalCache.messages);
    return;
  }

  const cachedCount = getCachedNavMessagesCount(userId, role);
  if (cachedCount != null && userId) {
    applyPersistedMessagesUnreadCount(userId, role, cachedCount);
  }
}

function seedNavigationBadgesFromPersistentStorage(): void {
  const { userId, role } = readCachedNavigation();

  if (!role) {
    return;
  }

  const localCache = readLocalNavigationBadgeCache(userId, role);
  const sessionCache = readNavigationBadgeCache(userId, role);
  const cache = sessionCache ?? localCache;

  if (!cache) {
    return;
  }

  if (localCache && !sessionCache) {
    writeNavigationBadgeCache(localCache);
  }

  const canViewGigs = canViewGigsSubNav(role);
  const gigsPending =
    getCachedGigsPendingCount(userId, role) ?? cache.gigsPending;

  writeRuntimeNavBadgeSnapshot({
    ...cache,
    gigsPending,
    badgesReady: true,
    reserveBadgeSpace: false,
    reserveGigsBadgeSpace: false,
  });
  writeRuntimeGigsPendingCount(cache.userId, cache.role, gigsPending);
  writeRuntimeMessagesUnreadCount(cache.userId, cache.role, cache.messages);
  writeRuntimeBadgeFetchedAt(cache.updatedAt);
  messagesLastFetchedAt = cache.updatedAt;
}

function applyPartialNavBadgeCounts(
  userId: string,
  role: UserRole,
  counts: NavBadgeCounts,
): void {
  const existing = resolveNavigationBadgeCache(userId, role);
  const gigsPending =
    existing?.gigsPending ?? getCachedGigsPendingCount(userId, role) ?? 0;
  const updatedAt = Date.now();
  const cache = {
    userId,
    role,
    messages: counts.messages,
    bookings: counts.bookings,
    gigsPending,
    updatedAt,
  };

  writeNavigationBadgeCache(cache);
  applyPersistedMessagesUnreadCount(userId, role, counts.messages);
  writeRuntimeNavBadgeSnapshot({
    ...cache,
    badgesReady: true,
    reserveBadgeSpace: false,
    reserveGigsBadgeSpace:
      canViewGigsSubNav(role) && getCachedGigsPendingCount(userId, role) == null,
  });
  writeRuntimeBadgeFetchedAt(updatedAt);
  messagesLastFetchedAt = updatedAt;
  notifyNavigationBadgeListeners();
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
  applyPersistedMessagesUnreadCount(userId, role, data.messages);
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

export function ensureNavMessagesPrefetched(
  userId?: string | null,
  role?: UserRole | null,
  options?: { force?: boolean },
): Promise<NavBadgeCounts | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  const cachedNav = readCachedNavigation();
  const resolvedRole = role ?? cachedNav.role;
  const resolvedUserIdHint = userId ?? cachedNav.userId;

  if (!resolvedRole) {
    return Promise.resolve(null);
  }

  const cached = resolveNavigationBadgeCache(resolvedUserIdHint, resolvedRole);
  const cachedMessages = getCachedNavMessagesCount(resolvedUserIdHint, resolvedRole);
  const fetchedAt = cached?.updatedAt ?? messagesLastFetchedAt;
  const isFresh = Date.now() - fetchedAt < NAV_BADGE_REFRESH_INTERVAL_MS;

  if (cachedMessages != null && !options?.force && isFresh) {
    return Promise.resolve({
      messages: cachedMessages,
      bookings: cached?.bookings ?? 0,
      total: cachedMessages + (cached?.bookings ?? 0),
    });
  }

  if (
    !options?.force &&
    messagesInFlight &&
    messagesInFlightIdentity &&
    messagesInFlightIdentity.role === resolvedRole &&
    (!resolvedUserIdHint ||
      !messagesInFlightIdentity.userId ||
      messagesInFlightIdentity.userId === resolvedUserIdHint)
  ) {
    return messagesInFlight;
  }

  messagesInFlightIdentity = {
    userId: resolvedUserIdHint ?? "",
    role: resolvedRole,
  };
  messagesInFlight = (async () => {
    try {
      const resolvedUserId = await resolvePrefetchUserId(resolvedUserIdHint);
      if (!resolvedUserId) {
        return null;
      }

      messagesInFlightIdentity = { userId: resolvedUserId, role: resolvedRole };
      const counts = await getNavBadgeCounts(resolvedUserId, resolvedRole);
      applyPartialNavBadgeCounts(resolvedUserId, resolvedRole, counts);
      return counts;
    } catch (error) {
      console.error("[navigationBadgePrefetch] Failed to prefetch messages badge count:", error);
      if (cached) {
        return {
          messages: cached.messages,
          bookings: cached.bookings,
          total: cached.messages + cached.bookings,
        };
      }
      return null;
    } finally {
      messagesInFlight = null;
      messagesInFlightIdentity = null;
    }
  })();

  return messagesInFlight;
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

  void ensureNavMessagesPrefetched(userId ?? cachedNav.userId, resolvedRole, options);

  return (async () => {
    const resolvedUserId = await resolvePrefetchUserId(userId ?? cachedNav.userId);
    if (!resolvedUserId || !resolvedRole) {
      return;
    }

    const hasCache = Boolean(resolveNavigationBadgeCache(resolvedUserId, resolvedRole));
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
  seedMessagesUnreadFromPersistentStorage();
  seedNavigationBadgesFromPersistentStorage();

  void ensureNavMessagesPrefetched();

  const role = readCachedNavRole();
  if (canViewGigsSubNav(role)) {
    void ensureGigsPendingPrefetched(role);
  }

  void ensureNavigationBadgesPrefetched();
}
