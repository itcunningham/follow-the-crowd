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

  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(NAV_BADGE_CACHE_KEY);
}
