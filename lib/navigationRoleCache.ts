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

/**
 * Cached navigation state only means something while a session exists.
 *
 * `readLocalNavRoleCache` already guarded on the session; the sessionStorage
 * path above it did not, so after a sign-out — or for an account deleted
 * server-side, which cannot reach a device's storage — a stale role survived
 * and drove authenticated prefetches that reached PostgREST as `anon`.
 *
 * Discarding here rather than only ignoring: a cache belonging to a session
 * that no longer exists is not going to become valid again, and leaving it
 * means the next reader repeats the same mistake.
 */
function discardCacheWithoutSession(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  if (readSupabaseSessionUserIdSync()) {
    return false;
  }

  const hadCachedState =
    sessionStorage.getItem(NAV_ROLE_CACHE_KEY) !== null ||
    sessionStorage.getItem(NAV_USER_CACHE_KEY) !== null;

  if (hadCachedState) {
    clearCachedNavigation();
  }

  return true;
}

export function readCachedNavRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (discardCacheWithoutSession()) {
    return null;
  }

  const cachedRole = sessionStorage.getItem(NAV_ROLE_CACHE_KEY);

  if (cachedRole === "dj" || cachedRole === "promoter" || cachedRole === "both") {
    return cachedRole;
  }

  return readLocalNavRoleCache()?.role ?? null;
}

export function readCachedNavigation(): { role: UserRole | null; userId: string | null } {
  if (discardCacheWithoutSession()) {
    return { role: null, userId: null };
  }

  const role = readCachedNavRole();
  const liveUserId = readSupabaseSessionUserIdSync();
  const cachedUserId =
    typeof window === "undefined" ? null : sessionStorage.getItem(NAV_USER_CACHE_KEY)?.trim() || null;

  // The live session wins. Previously a cached id was preferred over it, so an
  // id left behind by the previously signed-in account kept being used — which
  // is how a deleted user's id was still appearing in notification queries.
  if (cachedUserId && liveUserId && cachedUserId !== liveUserId) {
    clearCachedNavigation();
    return { role: null, userId: liveUserId };
  }

  const userId = liveUserId ?? cachedUserId;

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
