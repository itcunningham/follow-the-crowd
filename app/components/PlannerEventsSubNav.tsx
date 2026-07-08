"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import {
  getEventsAreaSubNavItems,
  isPlannerEventsAreaPath,
} from "@/lib/plannerEventsNav";
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

export default function PlannerEventsSubNav() {
  const pathname = usePathname();
  const guardProfile = useGuardProfile();
  const [role, setRole] = useState<UserRole | null>(guardProfile?.role ?? null);

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

  if (!isPlannerEventsAreaPath(pathname)) {
    return null;
  }

  const activeHref = getActiveHref(pathname);
  const tabs = getEventsAreaSubNavItems(role);

  return (
    <nav
      aria-label="Events area"
      className="mt-4 flex flex-wrap gap-2"
    >
      {tabs.map((tab) => {
        const isActive = activeHref === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive ? "ftc-filter-pill ftc-filter-pill-active" : "ftc-filter-pill"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
