import type { UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_CACHE_KEY = "ftc-nav-badge-counts";

export type NavigationBadgeCache = {
  userId: string;
  role: UserRole;
  messages: number;
  bookings: number;
  gigsPending: number;
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
  if (!userId || !role) {
    return null;
  }

  if (memoryCache?.userId === userId && memoryCache.role === role) {
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
  if (!parsed || parsed.userId !== userId || parsed.role !== role) {
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
}

export function readRuntimeNavBadgeSnapshot(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): RuntimeNavBadgeSnapshot | null {
  if (!userId || !role) {
    return null;
  }

  if (runtimeNavBadgeSnapshot?.userId === userId && runtimeNavBadgeSnapshot.role === role) {
    return runtimeNavBadgeSnapshot;
  }

  return null;
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
  if (!userId || !role) {
    return null;
  }

  if (
    runtimeGigsPendingIdentity?.userId === userId &&
    runtimeGigsPendingIdentity.role === role
  ) {
    return runtimeGigsPendingCount;
  }

  return null;
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
  const cached = readNavigationBadgeCache(userId, role);
  return cached?.gigsPending ?? null;
}
