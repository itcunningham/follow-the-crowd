import type { UserRole } from "@/lib/user/currentUser";
import { isEventCrewChatPath } from "@/lib/groupChats";
import { buildGigsWorkspaceIncomingHref } from "@/lib/bookings/gigsListNavigation";
import { readCachedNavRole } from "@/lib/navigationRoleCache";

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

export type WorkspaceSubNavTabId = keyof typeof EVENTS_AREA_SUB_NAV;

export type WorkspaceSubNavTab = {
  id: WorkspaceSubNavTabId;
  href: string;
  label: string;
};

/** Immutable canonical workspace row — fixed order, labels, and ids for every render. */
export const WORKSPACE_SUB_NAV_TABS: readonly WorkspaceSubNavTab[] = [
  { id: "events", href: EVENTS_AREA_SUB_NAV.events.href, label: EVENTS_AREA_SUB_NAV.events.label },
  {
    id: "bookingPlans",
    href: EVENTS_AREA_SUB_NAV.bookingPlans.href,
    label: EVENTS_AREA_SUB_NAV.bookingPlans.label,
  },
  {
    id: "calendar",
    href: EVENTS_AREA_SUB_NAV.calendar.href,
    label: EVENTS_AREA_SUB_NAV.calendar.label,
  },
  { id: "gigs", href: EVENTS_AREA_SUB_NAV.gigs.href, label: EVENTS_AREA_SUB_NAV.gigs.label },
];

export function isWorkspaceSubNavTabVisible(
  tabId: WorkspaceSubNavTabId,
  role: UserRole | null,
): boolean {
  if (role === null) {
    return true;
  }

  if (tabId === "bookingPlans") {
    return canViewBookingPlansSubNav(role);
  }

  if (tabId === "gigs") {
    return canViewGigsSubNav(role);
  }

  return true;
}

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

/** Prefer the role that preserves the fullest workspace tab set (avoids dj/null flicker dropping Event Plans). */
export function mergeWorkspaceNavRole(
  ...candidates: Array<UserRole | null | undefined>
): UserRole | null {
  const rank = (role: UserRole | null | undefined): number => {
    if (role === "both") {
      return 3;
    }

    if (role === "promoter" || role === "dj") {
      return 2;
    }

    return 0;
  };

  let bestRole: UserRole | null = null;
  let bestRank = 0;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const candidateRank = rank(candidate);

    if (candidateRank >= bestRank) {
      bestRank = candidateRank;
      bestRole = candidate;
    }
  }

  return bestRole;
}

/** Same role merge as workspace sub-nav and Events list chrome (cache + guard, prefer fullest role). */
export function resolveEventsWorkspaceChromeRole(
  ...candidates: Array<UserRole | null | undefined>
): UserRole | null {
  return mergeWorkspaceNavRole(...candidates, readCachedNavRole());
}

export function isCalendarWorkspacePath(pathname: string | null | undefined): boolean {
  return pathname === "/calendar" || (pathname?.startsWith("/calendar/") ?? false);
}

/** Workspace sub-nav destination; strips unrelated query when opening Gigs Incoming. */
export function buildWorkspaceSubNavDestinationHref(
  href: string,
  _currentPathname?: string | null,
): string {
  if (href === EVENTS_AREA_SUB_NAV.gigs.href) {
    return buildGigsWorkspaceIncomingHref();
  }

  return href;
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
