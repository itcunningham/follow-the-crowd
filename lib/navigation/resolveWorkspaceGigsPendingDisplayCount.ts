import {
  getCachedGigsPendingCount,
  readLocalGigsPendingCount,
  readWorkspaceGigsDisplaySessionCount,
  writeWorkspaceGigsDisplaySessionCount,
} from "@/lib/navigationBadgeCache";
import type { UserRole } from "@/lib/user/currentUser";

/** Stable workspace Gigs badge count — keeps last confirmed value during route transitions. */
export function resolveWorkspaceGigsPendingDisplayCount(input: {
  canViewGigs: boolean;
  userId: string | null | undefined;
  role: UserRole | null | undefined;
  providerCount: number;
  badgesReady: boolean;
}): number {
  if (!input.canViewGigs || !input.role) {
    return 0;
  }

  const cached = getCachedGigsPendingCount(input.userId, input.role);
  const sessionCount = readWorkspaceGigsDisplaySessionCount(input.userId, input.role);

  if (cached != null && cached > 0) {
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, cached);
    return cached;
  }

  if (input.providerCount > 0) {
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, input.providerCount);
    return input.providerCount;
  }

  if (cached === 0) {
    const localCount = readLocalGigsPendingCount(input.userId, input.role);
    if (localCount === 0) {
      writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, 0);
      return 0;
    }
    if (localCount != null && localCount > 0) {
      writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, localCount);
      return localCount;
    }
    if (sessionCount != null && sessionCount > 0) {
      return sessionCount;
    }
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, 0);
    return 0;
  }

  if (sessionCount != null) {
    return sessionCount;
  }

  if (input.badgesReady) {
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, input.providerCount);
    return Math.max(0, Math.floor(input.providerCount));
  }

  return 0;
}
