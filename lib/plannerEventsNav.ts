import type { UserRole } from "@/lib/user/currentUser";
import { isEventCrewChatPath } from "@/lib/groupChats";

export type EventsAreaSubNavItem = {
  href: string;
  label: string;
};

export const EVENTS_AREA_SUB_NAV = {
  events: { href: "/events", label: "Events" },
  bookingPlans: { href: "/booking-plans", label: "Event Plans" },
  calendar: { href: "/calendar", label: "Calendar" },
  gigs: { href: "/bookings", label: "Gigs" },
} as const;

/** @deprecated Use getEventsAreaSubNavItems(role) for role-aware tabs. */
export const PLANNER_EVENTS_SUB_NAV: EventsAreaSubNavItem[] = [
  EVENTS_AREA_SUB_NAV.events,
  EVENTS_AREA_SUB_NAV.bookingPlans,
  EVENTS_AREA_SUB_NAV.calendar,
  EVENTS_AREA_SUB_NAV.gigs,
];

export function canViewGigsSubNav(role: UserRole | null): boolean {
  return role === "dj" || role === "both";
}

export function canViewBookingPlansSubNav(role: UserRole | null): boolean {
  return role === "promoter" || role === "both";
}

export function getEventsAreaSubNavItems(role: UserRole | null): EventsAreaSubNavItem[] {
  const items: EventsAreaSubNavItem[] = [EVENTS_AREA_SUB_NAV.events];

  if (canViewBookingPlansSubNav(role)) {
    items.push(EVENTS_AREA_SUB_NAV.bookingPlans);
  }

  items.push(EVENTS_AREA_SUB_NAV.calendar);

  if (canViewGigsSubNav(role)) {
    items.push(EVENTS_AREA_SUB_NAV.gigs);
  }

  return items;
}

export function getActiveWorkspaceHref(pathname: string): string {
  if (pathname === "/events" || pathname.startsWith("/events/")) {
    return EVENTS_AREA_SUB_NAV.events.href;
  }

  if (pathname === "/booking-plans" || pathname.startsWith("/booking-plans/")) {
    return EVENTS_AREA_SUB_NAV.bookingPlans.href;
  }

  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return EVENTS_AREA_SUB_NAV.calendar.href;
  }

  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return EVENTS_AREA_SUB_NAV.gigs.href;
  }

  return EVENTS_AREA_SUB_NAV.events.href;
}

export function getPlannerWorkspaceTitle(workspaceHref: string): string {
  switch (workspaceHref) {
    case EVENTS_AREA_SUB_NAV.events.href:
      return EVENTS_AREA_SUB_NAV.events.label;
    case EVENTS_AREA_SUB_NAV.bookingPlans.href:
      return EVENTS_AREA_SUB_NAV.bookingPlans.label;
    case EVENTS_AREA_SUB_NAV.calendar.href:
      return EVENTS_AREA_SUB_NAV.calendar.label;
    case EVENTS_AREA_SUB_NAV.gigs.href:
      return EVENTS_AREA_SUB_NAV.gigs.label;
    default:
      return EVENTS_AREA_SUB_NAV.events.label;
  }
}

export function resolveActiveWorkspaceHref(
  pathname: string,
  overrideHref?: string | null,
): string {
  const pathnameHref = getActiveWorkspaceHref(pathname);
  const override = overrideHref?.trim();

  if (!override || override === pathnameHref) {
    return pathnameHref;
  }

  if (
    pathnameHref === EVENTS_AREA_SUB_NAV.gigs.href &&
    override === EVENTS_AREA_SUB_NAV.bookingPlans.href
  ) {
    return override;
  }

  if (
    pathnameHref === EVENTS_AREA_SUB_NAV.events.href &&
    override === EVENTS_AREA_SUB_NAV.calendar.href
  ) {
    return override;
  }

  return pathnameHref;
}

export function resolvePlannerWorkspaceTitle(options: {
  pathname: string;
  activeWorkspaceHref?: string | null;
}): string {
  const href = resolveActiveWorkspaceHref(options.pathname, options.activeWorkspaceHref);

  return getPlannerWorkspaceTitle(href);
}

export function isPlannerEventsAreaPath(pathname: string): boolean {
  if (isEventCrewChatPath(pathname)) {
    return false;
  }

  return (
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/booking-plans" ||
    pathname.startsWith("/booking-plans/") ||
    pathname === "/calendar" ||
    pathname.startsWith("/calendar/") ||
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/")
  );
}

export function isGigsAreaPath(pathname: string): boolean {
  return (
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/") ||
    pathname === "/calendar" ||
    pathname.startsWith("/calendar/")
  );
}
