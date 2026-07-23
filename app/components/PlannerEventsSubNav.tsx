"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import PlannerWorkspaceSubNavLink from "@/app/components/planner/PlannerWorkspaceSubNavLink";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { WorkspaceGigsPendingBadge } from "@/app/components/planner/WorkspaceGigsPendingBadge";
import {
  ensureGigsPendingPrefetched,
} from "@/lib/navigationBadgePrefetch";
import { subscribeWorkspaceGigsSubNavBadgeDisplay, readLocalGigsPendingCount, readWorkspaceGigsSubNavDisplayLatch } from "@/lib/navigationBadgeCache";
import { readWorkspaceGigsBadgeDisplayCountForSubNav } from "@/lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
import {
  canViewGigsSubNav,
  canViewBookingPlansSubNav,
  isPlannerEventsAreaPath,
  isWorkspaceSubNavTabVisible,
  mergeWorkspaceNavRole,
  resolveActiveWorkspaceHref,
  WORKSPACE_SUB_NAV_TABS,
} from "@/lib/plannerEventsNav";
import { ensureBookingPlansListPrefetched } from "@/lib/bookingPlans/bookingPlansListPrefetch";
import { ensureDjGigsCalendarPrefetched } from "@/lib/djGigsCalendarPrefetch";
import { ensurePlannerCalendarItemsPrefetched } from "@/lib/plannerCalendarPrefetch";
import { readCachedNavigation, readCachedNavRole } from "@/lib/navigationRoleCache";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

function useStableWorkspaceGigsSubNavCount(
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
  const stableCountRef = useRef(
    Math.max(latchedCount, rawCount, readDisplayCount()),
  );

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

export default function PlannerEventsSubNav({
  initialRole = null,
  activeWorkspaceHref,
  interceptWorkspaceTabNavigation,
}: {
  initialRole?: UserRole | null;
  /** Overrides pathname-derived workspace highlight (e.g. planner booking create on /bookings). */
  activeWorkspaceHref?: string | null;
  interceptWorkspaceTabNavigation?: ((href: string) => boolean) | null;
}) {
  const pathname = usePathname();
  const pathnameForSubNav =
    pathname && isPlannerEventsAreaPath(pathname)
      ? pathname
      : typeof window !== "undefined" && isPlannerEventsAreaPath(window.location.pathname)
        ? window.location.pathname
        : pathname;
  const router = useRouter();
  const guardProfile = useGuardProfile();
  const [cachedNavigation] = useState(readCachedNavigation);
  const [role, setRole] = useState<UserRole | null>(
    () => initialRole ?? guardProfile?.role ?? cachedNavigation.role,
  );
  const lastKnownRoleRef = useRef<UserRole | null>(
    initialRole ?? guardProfile?.role ?? cachedNavigation.role ?? readCachedNavRole(),
  );

  const resolvedRole =
    role ??
    guardProfile?.role ??
    initialRole ??
    cachedNavigation.role ??
    readCachedNavRole();

  const tabsRole = useMemo(
    () =>
      mergeWorkspaceNavRole(
        resolvedRole,
        initialRole,
        guardProfile?.role,
        cachedNavigation.role,
        lastKnownRoleRef.current,
        readCachedNavRole(),
      ),
    [cachedNavigation.role, guardProfile?.role, initialRole, resolvedRole],
  );

  if (tabsRole) {
    lastKnownRoleRef.current = tabsRole;
  }

  const roleForTabVisibility = tabsRole ?? lastKnownRoleRef.current;
  const canViewGigs = canViewGigsSubNav(roleForTabVisibility);
  const canViewBookingPlans = canViewBookingPlansSubNav(roleForTabVisibility);
  const resolvedUserId = guardProfile?.user_id ?? cachedNavigation.userId;
  const badgeRole = roleForTabVisibility ?? lastKnownRoleRef.current ?? readCachedNavRole();
  const badgeUserId = resolvedUserId ?? cachedNavigation.userId;
  const displayGigsPendingCount = useStableWorkspaceGigsSubNavCount(badgeUserId, badgeRole);

  useEffect(() => {
    WORKSPACE_SUB_NAV_TABS.forEach((tab) => {
      if (isWorkspaceSubNavTabVisible(tab.id, roleForTabVisibility)) {
        router.prefetch(tab.href);
      }
    });
  }, [roleForTabVisibility, router]);

  useEffect(() => {
    if (!resolvedRole || !canViewGigs) {
      return;
    }

    void ensureGigsPendingPrefetched(resolvedRole);
  }, [canViewGigs, resolvedRole]);

  useEffect(() => {
    if (!resolvedRole || !canViewBookingPlans) {
      return;
    }

    void ensureBookingPlansListPrefetched();
  }, [canViewBookingPlans, resolvedRole]);

  useEffect(() => {
    if (!resolvedRole) {
      return;
    }

    if (resolvedRole === "promoter" || resolvedRole === "both") {
      void ensurePlannerCalendarItemsPrefetched();
    }

    if (canViewGigs) {
      void ensureDjGigsCalendarPrefetched();
    }
  }, [canViewGigs, resolvedRole]);

  useEffect(() => {
    if (guardProfile?.role || initialRole || cachedNavigation.role) {
      return;
    }

    getCurrentUserProfile()
      .then((profile) => {
        setRole(profile?.role ?? null);
      })
      .catch((loadError) => {
        console.error("Failed to load events area sub-nav role:", loadError);
        setRole(null);
      });
  }, [guardProfile?.role, initialRole, cachedNavigation.role]);

  const showSubNav = isPlannerEventsAreaPath(pathnameForSubNav);
  const activeHref = resolveActiveWorkspaceHref(pathnameForSubNav, activeWorkspaceHref);

  if (!showSubNav) {
    return null;
  }

  return (
    <nav aria-label="Events area" className="flex min-w-max shrink-0 flex-nowrap gap-2">
      {WORKSPACE_SUB_NAV_TABS.map((tab) => {
        if (!isWorkspaceSubNavTabVisible(tab.id, roleForTabVisibility)) {
          return null;
        }

        const isActive = activeHref === tab.href;
        const showPendingBadge = tab.id === "gigs";

        return (
          <PlannerWorkspaceSubNavLink
            key={tab.id}
            href={tab.href}
            isActive={isActive}
            interceptNavigate={interceptWorkspaceTabNavigation ?? undefined}
          >
            {tab.label}
            {showPendingBadge ? (
              <WorkspaceGigsPendingBadge count={displayGigsPendingCount} isActive={isActive} />
            ) : null}
          </PlannerWorkspaceSubNavLink>
        );
      })}
    </nav>
  );
}
