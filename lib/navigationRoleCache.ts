import { clearNavigationBadgeCache } from "@/lib/navigationBadgeCache";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import type { UserRole } from "@/lib/user/currentUser";

const NAV_ROLE_CACHE_KEY = "ftc-nav-role";
const NAV_USER_CACHE_KEY = "ftc-nav-user-id";
const NAV_ROLE_LOCAL_CACHE_KEY = "ftc-nav-role-local";

type NavRoleLocalCache = {
  userId: string;
  role: UserRole;
  updatedAt: number;
};

function isUserRole(value: unknown): value is UserRole {
  return value === "dj" || value === "promoter" || value === "both";
}

function parseNavRoleLocalCache(raw: string): NavRoleLocalCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<NavRoleLocalCache>;

    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId.trim() ||
      !isUserRole(parsed.role) ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function readLocalNavRoleCache(): NavRoleLocalCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionUserId = readSupabaseSessionUserIdSync();
  if (!sessionUserId) {
    return null;
  }

  const raw = window.localStorage.getItem(NAV_ROLE_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = parseNavRoleLocalCache(raw);
  if (!parsed || parsed.userId !== sessionUserId) {
    return null;
  }

  return parsed;
}

function writeLocalNavRoleCache(userId: string, role: UserRole): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    NAV_ROLE_LOCAL_CACHE_KEY,
    JSON.stringify({
      userId,
      role,
      updatedAt: Date.now(),
    } satisfies NavRoleLocalCache),
  );
}

function seedSessionNavigationFromPersistentStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  const localCache = readLocalNavRoleCache();
  if (!localCache) {
    return;
  }

  if (!sessionStorage.getItem(NAV_ROLE_CACHE_KEY)) {
    sessionStorage.setItem(NAV_ROLE_CACHE_KEY, localCache.role);
  }

  if (!sessionStorage.getItem(NAV_USER_CACHE_KEY)) {
    sessionStorage.setItem(NAV_USER_CACHE_KEY, localCache.userId);
  }
}

if (typeof window !== "undefined") {
  seedSessionNavigationFromPersistentStorage();
}

export function readCachedNavRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cachedRole = sessionStorage.getItem(NAV_ROLE_CACHE_KEY);

  if (cachedRole === "dj" || cachedRole === "promoter" || cachedRole === "both") {
    return cachedRole;
  }

  return readLocalNavRoleCache()?.role ?? null;
}

export function readCachedNavigation(): { role: UserRole | null; userId: string | null } {
  const role = readCachedNavRole();
  const sessionUserId =
    typeof window === "undefined" ? null : sessionStorage.getItem(NAV_USER_CACHE_KEY)?.trim() || null;
  const userId = sessionUserId ?? readSupabaseSessionUserIdSync();

  return { role, userId: userId?.trim() ? userId : null };
}

export function cacheNavigationRole(role: UserRole, userId?: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(NAV_ROLE_CACHE_KEY, role);

  if (userId) {
    sessionStorage.setItem(NAV_USER_CACHE_KEY, userId);
    writeLocalNavRoleCache(userId, role);
  }
}

export function clearCachedNavigation(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(NAV_ROLE_CACHE_KEY);
  sessionStorage.removeItem(NAV_USER_CACHE_KEY);
  window.localStorage.removeItem(NAV_ROLE_LOCAL_CACHE_KEY);
  clearNavigationBadgeCache();
}

export function resolveIsOwnProfilePath(
  profileUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!profileUserId?.trim()) {
    return false;
  }

  const resolvedUserId = currentUserId ?? readCachedNavigation().userId;

  return Boolean(resolvedUserId && profileUserId === resolvedUserId);
}
