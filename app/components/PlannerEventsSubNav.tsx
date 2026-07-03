"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isPlannerEventsAreaPath,
  PLANNER_EVENTS_SUB_NAV,
} from "@/lib/plannerEventsNav";

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
    return "/events";
  }

  return "/events";
}

export default function PlannerEventsSubNav() {
  const pathname = usePathname();

  if (!isPlannerEventsAreaPath(pathname)) {
    return null;
  }

  const activeHref = getActiveHref(pathname);

  return (
    <nav
      aria-label="Events area"
      className="mt-4 flex flex-wrap gap-2"
    >
      {PLANNER_EVENTS_SUB_NAV.map((tab) => {
        const isActive = activeHref === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border border-blue-500/45 bg-blue-600/15 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.12)]"
                : "border border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:border-blue-500/30 hover:text-blue-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
