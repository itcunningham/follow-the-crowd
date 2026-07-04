export const PLANNER_EVENTS_SUB_NAV = [
  { href: "/events", label: "Events" },
  { href: "/booking-plans", label: "Booking Plans" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bookings", label: "Bookings" },
] as const;

export function isPlannerEventsAreaPath(pathname: string): boolean {
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
