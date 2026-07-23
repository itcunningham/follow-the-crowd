import {
  getCachedGigsPendingCount,
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
  if (cached != null) {
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, cached);
    return cached;
  }

  if (input.providerCount > 0) {
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, input.providerCount);
    return input.providerCount;
  }

  const sessionCount = readWorkspaceGigsDisplaySessionCount(input.userId, input.role);
  if (sessionCount != null) {
    return sessionCount;
  }

  if (input.badgesReady) {
    writeWorkspaceGigsDisplaySessionCount(input.userId, input.role, input.providerCount);
    return Math.max(0, Math.floor(input.providerCount));
  }

  return 0;
}
