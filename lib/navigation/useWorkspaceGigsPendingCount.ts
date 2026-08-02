"use client";

import { useRef, useSyncExternalStore } from "react";
import {
  readLocalGigsPendingCount,
  readWorkspaceGigsSubNavDisplayLatch,
  subscribeWorkspaceGigsSubNavBadgeDisplay,
} from "@/lib/navigationBadgeCache";
import {
  readWorkspaceGigsBadgeDisplayCountForSubNav,
  resolveStableGigsPendingCount,
} from "@/lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
import type { UserRole } from "@/lib/user/currentUser";

/**
 * Pending-incoming-gigs count for navigation badges. A known count is used
 * as-is, so accepting or declining a request moves the badge immediately in
 * either direction; the hold in resolveStableGigsPendingCount applies only
 * while the count is unknown, so route transitions and cache warm-up can't
 * blink the badge off.
 *
 * Shared by the workspace sub-nav Gigs pill and the DJ main-nav Gigs tab so
 * both always show the same number as the Gigs Incoming tab, which reads the
 * same `countDjGigsByTab(...).pending` source.
 */
export function useWorkspaceGigsPendingCount(
  badgeUserId: string | null | undefined,
  badgeRole: UserRole | null | undefined,
): number {
  const readDisplayCount = () =>
    readWorkspaceGigsBadgeDisplayCountForSubNav(badgeUserId, badgeRole);
  const rawCount = useSyncExternalStore(
    subscribeWorkspaceGigsSubNavBadgeDisplay,
    readDisplayCount,
    readDisplayCount,
  );
  const latchedCount = readWorkspaceGigsSubNavDisplayLatch(badgeUserId, badgeRole) ?? 0;
  const stableCountRef = useRef(Math.max(latchedCount, rawCount, readDisplayCount()));

  const count = resolveStableGigsPendingCount({
    localCount: readLocalGigsPendingCount(badgeUserId, badgeRole),
    latchedCount,
    rawCount,
    previousCount: stableCountRef.current,
  });

  stableCountRef.current = count;

  return count;
}
