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
import { formatGigsTabCountDisplay, formatGigsTabCountAriaCount } from "@/lib/bookings/gigsTabCountDisplay";
import { WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS } from "@/lib/design/workspaceSubNavBadge";
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

function GigsPendingCountBadge({
  count,
  isActive,
  reserveSpace,
}: {
  count: number;
  isActive: boolean;
  reserveSpace?: boolean;
}) {
  const badgeToneClass =
    count > 0
      ? isActive
        ? "bg-ftc-bg/20 text-ftc-bg"
        : "bg-ftc-primary/15 text-ftc-primary"
      : "";

  if (count <= 0) {
    if (!reserveSpace) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className={`${WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS} opacity-0 ${badgeToneClass}`.trim()}
      >
        99+
      </span>
    );
  }

  const display = formatGigsTabCountDisplay(count)!;

  return (
    <span
      aria-label={`${formatGigsTabCountAriaCount(count)} pending incoming gig${count === 1 ? "" : "s"}`}
      className={`${WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS} ${badgeToneClass}`}
    >
      {display}
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
  const badgeCacheVersion = useSyncExternalStore(
    subscribeNavigationBadgeListeners,
    getNavigationBadgeCacheVersion,
    () => 0,
  );

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
