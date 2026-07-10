import type { UserRole } from "@/lib/user/currentUser";
import { isEventCrewChatPath } from "@/lib/groupChats";

export type EventsAreaSubNavItem = {
  href: string;
  label: string;
};

export const EVENTS_AREA_SUB_NAV = {
  events: { href: "/events", label: "Events" },
  bookingPlans: { href: "/booking-plans", label: "Booking Plans" },
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
