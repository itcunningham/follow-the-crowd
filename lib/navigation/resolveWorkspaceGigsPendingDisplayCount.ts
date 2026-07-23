import { getCachedGigsPendingCount } from "@/lib/navigationBadgeCache";
import type { UserRole } from "@/lib/user/currentUser";

/** Stable Gigs workspace badge count — preserves last known value through route transitions. */
export function resolveWorkspaceGigsPendingDisplayCount(input: {
  canViewGigs: boolean;
  userId: string | null | undefined;
  role: UserRole | null | undefined;
  providerCount: number;
  badgesReady: boolean;
  lastKnownCount: number;
}): number {
  if (!input.canViewGigs) {
    return 0;
  }

  const cached = getCachedGigsPendingCount(input.userId, input.role);
  if (cached != null) {
    return cached;
  }

  if (input.providerCount > 0) {
    return input.providerCount;
  }

  if (input.badgesReady) {
    return Math.max(0, Math.floor(input.providerCount));
  }

  return Math.max(0, Math.floor(input.lastKnownCount));
}
