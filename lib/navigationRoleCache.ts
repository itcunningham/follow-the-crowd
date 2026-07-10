import type { UserRole } from "@/lib/user/currentUser";

const NAV_ROLE_CACHE_KEY = "ftc-nav-role";
const NAV_USER_CACHE_KEY = "ftc-nav-user-id";

export function readCachedNavRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cachedRole = sessionStorage.getItem(NAV_ROLE_CACHE_KEY);

  if (cachedRole === "dj" || cachedRole === "promoter" || cachedRole === "both") {
    return cachedRole;
  }

  return null;
}

export function readCachedNavigation(): { role: UserRole | null; userId: string | null } {
  const role = readCachedNavRole();
  const userId =
    typeof window === "undefined" ? null : sessionStorage.getItem(NAV_USER_CACHE_KEY);

  return { role, userId: userId?.trim() ? userId : null };
}

export function cacheNavigationRole(role: UserRole, userId?: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(NAV_ROLE_CACHE_KEY, role);

  if (userId) {
    sessionStorage.setItem(NAV_USER_CACHE_KEY, userId);
  }
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
