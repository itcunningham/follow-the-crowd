"use client";

import { useRef, useSyncExternalStore } from "react";
import {
  readLocalGigsPendingCount,
  readWorkspaceGigsSubNavDisplayLatch,
  subscribeWorkspaceGigsSubNavBadgeDisplay,
} from "@/lib/navigationBadgeCache";
import { readWorkspaceGigsBadgeDisplayCountForSubNav } from "@/lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
import type { UserRole } from "@/lib/user/currentUser";

/**
 * Pending-incoming-gigs count for navigation badges, stabilised against the
 * zero frames that route transitions and cache warm-up produce: the count only
 * drops to 0 once the local snapshot genuinely says 0, so the badge never
 * blinks off and back on while navigating.
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

  const localCount = readLocalGigsPendingCount(badgeUserId, badgeRole);
  if (localCount === 0) {
    stableCountRef.current = 0;
    return 0;
  }

  const nextCount = Math.max(stableCountRef.current, latchedCount, rawCount);
  if (nextCount > 0) {
    stableCountRef.current = nextCount;
  }

  return stableCountRef.current;
}
