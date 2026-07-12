"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { countPendingIncomingGigs } from "@/lib/bookingRequests";
import {
  canViewGigsSubNav,
  EVENTS_AREA_SUB_NAV,
  getEventsAreaSubNavItems,
  isPlannerEventsAreaPath,
} from "@/lib/plannerEventsNav";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
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
}: {
  count: number;
  isActive: boolean;
}) {
  if (count <= 0) {
    return null;
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
  const [role, setRole] = useState<UserRole | null>(
    () => initialRole ?? guardProfile?.role ?? readCachedNavRole(),
  );
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);
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
  }, [guardProfile?.role]);

  useEffect(() => {
    if (!canViewGigsSubNav(role)) {
      setPendingIncomingCount(0);
      return;
    }

    let cancelled = false;

    countPendingIncomingGigs()
      .then((count) => {
        if (!cancelled) {
          setPendingIncomingCount(count);
        }
      })
      .catch((loadError) => {
        console.error("Failed to load pending incoming gigs count:", loadError);
        if (!cancelled) {
          setPendingIncomingCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  if (!isPlannerEventsAreaPath(pathname)) {
    return null;
  }

  const activeHref = activeWorkspaceHref ?? getActiveHref(pathname);
  const tabs = getEventsAreaSubNavItems(role);

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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive ? "ftc-filter-pill ftc-filter-pill-active" : "ftc-filter-pill"
            }`}
          >
            {tab.label}
            {showPendingBadge ? (
              <GigsPendingCountBadge count={pendingIncomingCount} isActive={isActive} />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
