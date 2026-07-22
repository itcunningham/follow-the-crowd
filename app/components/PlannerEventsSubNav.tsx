"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import PlannerWorkspaceSubNavLink from "@/app/components/planner/PlannerWorkspaceSubNavLink";
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
  canViewBookingPlansSubNav,
  EVENTS_AREA_SUB_NAV,
  getEventsAreaSubNavItems,
  isPlannerEventsAreaPath,
  resolveActiveWorkspaceHref,
} from "@/lib/plannerEventsNav";
import { ensureBookingPlansListPrefetched } from "@/lib/bookingPlans/bookingPlansListPrefetch";
import { ensureDjGigsCalendarPrefetched } from "@/lib/djGigsCalendarPrefetch";
import { ensurePlannerCalendarItemsPrefetched } from "@/lib/plannerCalendarPrefetch";
import { readCachedNavigation, readCachedNavRole } from "@/lib/navigationRoleCache";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

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
  const { gigsPendingCount } = useNavBadges();
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

  if (resolvedRole) {
    lastKnownRoleRef.current = resolvedRole;
  }

  const tabsRole = resolvedRole ?? lastKnownRoleRef.current;
  const canViewGigs = canViewGigsSubNav(tabsRole);
  const canViewBookingPlans = canViewBookingPlansSubNav(tabsRole);
  const resolvedUserId = guardProfile?.user_id ?? cachedNavigation.userId;
  const badgeCacheVersion = useSyncExternalStore(
    subscribeNavigationBadgeListeners,
    getNavigationBadgeCacheVersion,
    () => 0,
  );

  const tabs = useMemo(
    () => getEventsAreaSubNavItems(tabsRole),
    [tabsRole],
  );

  useEffect(() => {
    tabs.forEach((tab) => {
      router.prefetch(tab.href);
    });
  }, [router, tabs]);

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
      {tabs.map((tab) => {
        const isActive = activeHref === tab.href;
        const showPendingBadge = tab.href === EVENTS_AREA_SUB_NAV.gigs.href;

        return (
          <PlannerWorkspaceSubNavLink
            key={tab.href}
            href={tab.href}
            isActive={isActive}
            interceptNavigate={interceptWorkspaceTabNavigation ?? undefined}
          >
            {tab.label}
            {showPendingBadge ? (
              <GigsPendingCountBadge
                count={displayGigsPendingCount}
                isActive={isActive}
                reserveSpace
              />
            ) : null}
          </PlannerWorkspaceSubNavLink>
        );
      })}
    </nav>
  );
}
