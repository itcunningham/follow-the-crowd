import {
  getCachedGigsPendingCount,
  readLocalGigsPendingCount,
  readRuntimeNavBadgeSnapshot,
  readWorkspaceGigsDisplaySessionCount,
  readWorkspaceGigsSubNavDisplayLatch,
  syncWorkspaceGigsSubNavDisplayLatch,
  writeWorkspaceGigsDisplaySessionCount,
} from "@/lib/navigationBadgeCache";
import { readCachedNavigation, readCachedNavRole } from "@/lib/navigationRoleCache";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import type { UserRole } from "@/lib/user/currentUser";

/** Stable workspace Gigs badge count — keeps last confirmed value during route transitions. */
export function resolveWorkspaceGigsPendingDisplayCount(input: {
  canViewGigs: boolean;
  userId: string | null | undefined;
  role: UserRole | null | undefined;
  providerCount: number;
  badgesReady: boolean;
}): number {
  if (!input.canViewGigs) {
    return 0;
  }

  const role = input.role ?? readCachedNavRole() ?? readCachedNavigation().role;
  if (!role) {
    return 0;
  }

  const userId = input.userId ?? readCachedNavigation().userId;

  const cached = getCachedGigsPendingCount(userId, role);
  const sessionCount = readWorkspaceGigsDisplaySessionCount(userId, role);

  if (cached != null && cached > 0) {
    writeWorkspaceGigsDisplaySessionCount(userId, role, cached);
    return cached;
  }

  if (input.providerCount > 0) {
    writeWorkspaceGigsDisplaySessionCount(userId, role, input.providerCount);
    return input.providerCount;
  }

  if (cached === 0) {
    const localCount = readLocalGigsPendingCount(userId, role);
    if (localCount === 0) {
      writeWorkspaceGigsDisplaySessionCount(userId, role, 0);
      return 0;
    }
    if (localCount != null && localCount > 0) {
      writeWorkspaceGigsDisplaySessionCount(userId, role, localCount);
      return localCount;
    }
    if (sessionCount != null && sessionCount > 0) {
      return sessionCount;
    }
    const latchedWhenCachedZero = readWorkspaceGigsSubNavDisplayLatch(userId, role);
    if (latchedWhenCachedZero != null && latchedWhenCachedZero > 0) {
      return latchedWhenCachedZero;
    }
    writeWorkspaceGigsDisplaySessionCount(userId, role, 0);
    return 0;
  }

  if (sessionCount != null) {
    return sessionCount;
  }

  if (input.badgesReady) {
    if (input.providerCount === 0) {
      const latchedCount = readWorkspaceGigsSubNavDisplayLatch(userId, role);
      if (latchedCount != null && latchedCount > 0) {
        return latchedCount;
      }
      if (sessionCount != null && sessionCount > 0) {
        return sessionCount;
      }
      const localWhenReady = readLocalGigsPendingCount(userId, role);
      if (localWhenReady != null && localWhenReady > 0) {
        writeWorkspaceGigsDisplaySessionCount(userId, role, localWhenReady);
        return localWhenReady;
      }
    }
    writeWorkspaceGigsDisplaySessionCount(userId, role, input.providerCount);
    return Math.max(0, Math.floor(input.providerCount));
  }

  return 0;
}

function finalizeWorkspaceGigsBadgeDisplayCount(
  userId: string | null | undefined,
  role: UserRole,
  computed: number,
): number {
  const localCount = readLocalGigsPendingCount(userId, role);
  if (localCount === 0) {
    writeWorkspaceGigsDisplaySessionCount(userId, role, 0);
    return 0;
  }

  if (computed > 0) {
    return computed;
  }

  const latchedCount = readWorkspaceGigsSubNavDisplayLatch(userId, role);
  if (latchedCount != null && latchedCount > 0) {
    return latchedCount;
  }

  const sessionCount = readWorkspaceGigsDisplaySessionCount(userId, role);
  if (sessionCount != null && sessionCount > 0) {
    return sessionCount;
  }

  return computed;
}

/** Snapshot for workspace sub-nav — reads runtime/cache directly (avoids React context zero frames). */
export function readWorkspaceGigsBadgeDisplayCountForSubNav(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number {
  const resolvedRole = role ?? readCachedNavRole() ?? readCachedNavigation().role;
  if (!resolvedRole || !canViewGigsSubNav(resolvedRole)) {
    return 0;
  }

  const resolvedUserId = userId ?? readCachedNavigation().userId;
  const localCount = readLocalGigsPendingCount(resolvedUserId, resolvedRole);
  if (localCount === 0) {
    syncWorkspaceGigsSubNavDisplayLatch(resolvedUserId, resolvedRole, 0);
    return 0;
  }

  const latchedBeforeResolve = readWorkspaceGigsSubNavDisplayLatch(resolvedUserId, resolvedRole);
  const runtimeSnapshot = readRuntimeNavBadgeSnapshot(resolvedUserId, resolvedRole);
  const cached = getCachedGigsPendingCount(resolvedUserId, resolvedRole);
  const providerCount = cached ?? runtimeSnapshot?.gigsPending ?? 0;
  const badgesReady =
    runtimeSnapshot?.badgesReady === true ||
    cached != null ||
    readWorkspaceGigsDisplaySessionCount(resolvedUserId, resolvedRole) != null;

  const computed = resolveWorkspaceGigsPendingDisplayCount({
    canViewGigs: true,
    userId: resolvedUserId,
    role: resolvedRole,
    providerCount,
    badgesReady,
  });

  let result = finalizeWorkspaceGigsBadgeDisplayCount(resolvedUserId, resolvedRole, computed);

  if (
    result === 0 &&
    latchedBeforeResolve != null &&
    latchedBeforeResolve > 0 &&
    localCount !== 0
  ) {
    result = latchedBeforeResolve;
  }

  if (result > 0 || localCount === 0) {
    syncWorkspaceGigsSubNavDisplayLatch(resolvedUserId, resolvedRole, result);
  }

  return result;
}
