"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { useNavBadges } from "@/app/components/navigation/NavBadgeProvider";
import { getCachedGigsPendingCount } from "@/lib/navigationBadgeCache";
import {
  ensureGigsPendingPrefetched,
  getNavigationBadgeCacheVersion,
  subscribeNavigationBadgeListeners,
} from "@/lib/navigationBadgePrefetch";
import {
  canViewGigsSubNav,
  EVENTS_AREA_SUB_NAV,
  getEventsAreaSubNavItems,
  isPlannerEventsAreaPath,
} from "@/lib/plannerEventsNav";
import { readCachedNavigation } from "@/lib/navigationRoleCache";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

function getActiveHref(pathname: string): string {
  if (pathname === "/events" || pathname.startsWith("/events/")) {
    return "/events";
  }

  if (pathname === "/booking-plans" || pathname.startsWith("/booking-plans/")) {
    return "/booking-plans";
  }

  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return "/calendar";
  }

  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return "/bookings";
  }

  return "/events";
}

function GigsPendingCountBadge({
  count,
  isActive,
  reserveSpace,
}: {
  count: number;
  isActive: boolean;
  reserveSpace?: boolean;
}) {
  if (count <= 0) {
    if (!reserveSpace) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 min-w-4 shrink-0 opacity-0"
      />
    );
  }

  return (
    <span
      aria-label={`${count} pending incoming gig${count === 1 ? "" : "s"}`}
      className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
        isActive
          ? "bg-ftc-bg/20 text-ftc-bg"
          : "bg-ftc-primary/15 text-ftc-primary"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function PlannerEventsSubNav({
  initialRole = null,
  activeWorkspaceHref,
}: {
  initialRole?: UserRole | null;
  /** Overrides pathname-derived workspace highlight (e.g. planner booking create on /bookings). */
  activeWorkspaceHref?: string | null;
}) {
  const pathname = usePathname();
  const guardProfile = useGuardProfile();
  const { gigsPendingCount, reserveGigsBadgeSpace } = useNavBadges();
  const [cachedNavigation] = useState(readCachedNavigation);
  const [role, setRole] = useState<UserRole | null>(
    () => initialRole ?? guardProfile?.role ?? cachedNavigation.role,
  );

  const resolvedRole = role ?? guardProfile?.role ?? initialRole ?? cachedNavigation.role;
  const canViewGigs = canViewGigsSubNav(resolvedRole);
  const resolvedUserId = guardProfile?.user_id ?? cachedNavigation.userId;
  const badgeCacheVersion = useSyncExternalStore(
    subscribeNavigationBadgeListeners,
    getNavigationBadgeCacheVersion,
    () => 0,
  );

  useEffect(() => {
    if (!resolvedRole || !canViewGigs) {
      return;
    }

    void ensureGigsPendingPrefetched(resolvedRole);
  }, [canViewGigs, resolvedRole]);

  const displayGigsPendingCount = useMemo(() => {
    if (!canViewGigs) {
      return 0;
    }

    const cachedCount = getCachedGigsPendingCount(resolvedUserId, resolvedRole);
    if (cachedCount != null) {
      return cachedCount;
    }

    return gigsPendingCount;
  }, [badgeCacheVersion, canViewGigs, gigsPendingCount, resolvedRole, resolvedUserId]);

  const hasKnownGigsCount =
    canViewGigs && getCachedGigsPendingCount(resolvedUserId, resolvedRole) != null;

  const shouldReserveGigsBadgeSpace =
    canViewGigs && !hasKnownGigsCount && reserveGigsBadgeSpace;

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);
      return;
    }

    if (initialRole) {
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
  }, [guardProfile?.role, initialRole]);

  if (!isPlannerEventsAreaPath(pathname)) {
    return null;
  }

  const activeHref = activeWorkspaceHref ?? getActiveHref(pathname);
  const tabs = getEventsAreaSubNavItems(resolvedRole);

  return (
    <nav
      aria-label="Events area"
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => {
        const isActive = activeHref === tab.href;
        const showPendingBadge = tab.href === EVENTS_AREA_SUB_NAV.gigs.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 ftc-filter-pill ${isActive ? "ftc-filter-pill-active" : ""}`}
          >
            {tab.label}
            {showPendingBadge ? (
              <GigsPendingCountBadge
                count={displayGigsPendingCount}
                isActive={isActive}
                reserveSpace={shouldReserveGigsBadgeSpace}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
