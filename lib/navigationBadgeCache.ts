import type { UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_CACHE_KEY = "ftc-nav-badge-counts";
const GIGS_PENDING_LOCAL_CACHE_KEY = "ftc-gigs-pending-count";

export type NavigationBadgeCache = {
  userId: string;
  role: UserRole;
  messages: number;
  bookings: number;
  gigsPending: number;
  updatedAt: number;
};

type GigsPendingLocalCache = {
  userId: string;
  role: UserRole;
  count: number;
  updatedAt: number;
};

let memoryCache: NavigationBadgeCache | null = null;
let runtimeGigsPendingCount: number | null = null;
let runtimeGigsPendingIdentity: { userId: string; role: UserRole } | null = null;
let runtimeBadgeFetchedAt = 0;

export type RuntimeNavBadgeSnapshot = NavigationBadgeCache & {
  badgesReady: boolean;
  reserveBadgeSpace: boolean;
  reserveGigsBadgeSpace: boolean;
};

let runtimeNavBadgeSnapshot: RuntimeNavBadgeSnapshot | null = null;

function isUserRole(value: unknown): value is UserRole {
  return value === "dj" || value === "promoter" || value === "both";
}

function parseGigsPendingLocalCache(raw: string): GigsPendingLocalCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GigsPendingLocalCache>;

    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId.trim() ||
      !isUserRole(parsed.role) ||
      typeof parsed.count !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      count: Math.max(0, Math.floor(parsed.count)),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function matchesGigsPendingIdentity(
  storedUserId: string,
  storedRole: UserRole,
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): boolean {
  if (!role || storedRole !== role) {
    return false;
  }

  if (userId && storedUserId !== userId) {
    return false;
  }

  return true;
}

export function readLocalGigsPendingCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  return readLocalGigsPendingCache(userId, role)?.count ?? null;
}

export function readLocalGigsPendingCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): GigsPendingLocalCache | null {
  if (!role || typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(GIGS_PENDING_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = parseGigsPendingLocalCache(raw);
  if (!parsed || !matchesGigsPendingIdentity(parsed.userId, parsed.role, userId, role)) {
    return null;
  }

  return parsed;
}

export function writeLocalGigsPendingCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    GIGS_PENDING_LOCAL_CACHE_KEY,
    JSON.stringify({
      userId,
      role,
      count: Math.max(0, Math.floor(count)),
      updatedAt: Date.now(),
    } satisfies GigsPendingLocalCache),
  );
}

export function applyPersistedGigsPendingCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  const normalizedCount = Math.max(0, Math.floor(count));

  writeRuntimeGigsPendingCount(userId, role, normalizedCount);
  writeLocalGigsPendingCount(userId, role, normalizedCount);

  const existing = readNavigationBadgeCache(userId, role);
  if (existing) {
    writeNavigationBadgeCache({
      ...existing,
      gigsPending: normalizedCount,
      updatedAt: Date.now(),
    });
  }
}

function parseNavigationBadgeCache(raw: string): NavigationBadgeCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<NavigationBadgeCache>;

    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId.trim() ||
      !isUserRole(parsed.role) ||
      typeof parsed.messages !== "number" ||
      typeof parsed.bookings !== "number" ||
      typeof parsed.gigsPending !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      messages: Math.max(0, Math.floor(parsed.messages)),
      bookings: Math.max(0, Math.floor(parsed.bookings)),
      gigsPending: Math.max(0, Math.floor(parsed.gigsPending)),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function readNavigationBadgeCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): NavigationBadgeCache | null {
  if (!role) {
    return null;
  }

  if (userId && memoryCache?.userId === userId && memoryCache.role === role) {
    return memoryCache;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const stored = sessionStorage.getItem(NAV_BADGE_CACHE_KEY);
  if (!stored) {
    return null;
  }

  const parsed = parseNavigationBadgeCache(stored);
  if (!parsed || parsed.role !== role) {
    return null;
  }

  if (userId && parsed.userId !== userId) {
    return null;
  }

  memoryCache = parsed;
  return parsed;
}

export function writeNavigationBadgeCache(cache: NavigationBadgeCache): void {
  memoryCache = cache;

  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(NAV_BADGE_CACHE_KEY, JSON.stringify(cache));
}

export function clearNavigationBadgeCache(): void {
  memoryCache = null;
  runtimeGigsPendingCount = null;
  runtimeGigsPendingIdentity = null;
  runtimeBadgeFetchedAt = 0;
  runtimeNavBadgeSnapshot = null;

  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(NAV_BADGE_CACHE_KEY);
  window.localStorage.removeItem(GIGS_PENDING_LOCAL_CACHE_KEY);
}

export function readRuntimeNavBadgeSnapshot(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): RuntimeNavBadgeSnapshot | null {
  if (!role || runtimeNavBadgeSnapshot?.role !== role) {
    return null;
  }

  if (userId && runtimeNavBadgeSnapshot.userId !== userId) {
    return null;
  }

  return runtimeNavBadgeSnapshot;
}

export function writeRuntimeNavBadgeSnapshot(snapshot: RuntimeNavBadgeSnapshot): void {
  runtimeNavBadgeSnapshot = snapshot;
  runtimeGigsPendingIdentity = { userId: snapshot.userId, role: snapshot.role };
  runtimeGigsPendingCount = snapshot.gigsPending;
}

export function readRuntimeGigsPendingCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role || runtimeGigsPendingIdentity?.role !== role) {
    return null;
  }

  if (userId && runtimeGigsPendingIdentity.userId !== userId) {
    return null;
  }

  return runtimeGigsPendingCount;
}

export function writeRuntimeGigsPendingCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  runtimeGigsPendingIdentity = { userId, role };
  runtimeGigsPendingCount = Math.max(0, Math.floor(count));
}

export function readRuntimeBadgeFetchedAt(): number {
  return runtimeBadgeFetchedAt;
}

export function writeRuntimeBadgeFetchedAt(fetchedAt: number): void {
  runtimeBadgeFetchedAt = fetchedAt;
}

export function getCachedGigsPendingCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role) {
    return null;
  }

  const runtimeCount = readRuntimeGigsPendingCount(userId, role);
  if (runtimeCount != null) {
    return runtimeCount;
  }

  const sessionCache = readNavigationBadgeCache(userId, role);
  if (sessionCache) {
    return sessionCache.gigsPending;
  }

  return readLocalGigsPendingCount(userId, role);
}
