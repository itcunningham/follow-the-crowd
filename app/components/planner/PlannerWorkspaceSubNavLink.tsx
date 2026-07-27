"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, type ReactNode } from "react";
import { clearGigsListTabPending } from "@/lib/bookings/gigsListTabPending";
import { clearEventsListTabCache } from "@/lib/events/eventsListTabCache";
import {
  isCalendarCreateWorkspaceLocation,
  navigateAwayFromCalendarCreateWorkspace,
} from "@/lib/events/eventsListNavigation";
import {
  buildWorkspaceSubNavDestinationHref,
  EVENTS_AREA_SUB_NAV,
  isCalendarWorkspacePath,
} from "@/lib/plannerEventsNav";

function isEventsWorkspacePath(pathname: string | null | undefined): boolean {
  return pathname === "/events" || (pathname?.startsWith("/events/") ?? false);
}

const PLANNER_WORKSPACE_SUB_NAV_HIT_CLASS =
  "relative inline-flex shrink-0 min-h-11 min-w-11 items-center justify-center touch-manipulation";

const PLANNER_WORKSPACE_SUB_NAV_PILL_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 ftc-filter-pill ftc-workspace-subnav-pill";

type PlannerWorkspaceSubNavLinkProps = {
  href: string;
  isActive: boolean;
  children: ReactNode;
  interceptNavigate?: (href: string) => boolean;
};

export default function PlannerWorkspaceSubNavLink({
  href,
  isActive,
  children,
  interceptNavigate,
}: PlannerWorkspaceSubNavLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const destinationHref = buildWorkspaceSubNavDestinationHref(href, pathname);
  const navigatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{ pointerId: number; cancelled: boolean } | null>(null);

  const shouldLeaveCalendarViaNativeLink = useCallback(() => {
    return (
      isCalendarWorkspacePath(pathname) &&
      !interceptNavigate &&
      !isCalendarCreateWorkspaceLocation(pathname)
    );
  }, [interceptNavigate, pathname]);

  const shouldCommitNavigationGesture = useCallback(() => {
    return Boolean(interceptNavigate) || isCalendarCreateWorkspaceLocation(pathname);
  }, [interceptNavigate, pathname]);

  const commitNavigation = useCallback(
    () => {
      if (interceptNavigate?.(destinationHref)) {
        navigatedThisGestureRef.current = true;
        return;
      }

      if (navigatedThisGestureRef.current || isActive) {
        return;
      }

      navigatedThisGestureRef.current = true;

      if (href === EVENTS_AREA_SUB_NAV.gigs.href) {
        clearGigsListTabPending();
      }

      if (
        isEventsWorkspacePath(pathname) &&
        href !== EVENTS_AREA_SUB_NAV.events.href
      ) {
        clearEventsListTabCache();
      }

      if (isCalendarCreateWorkspaceLocation(pathname)) {
        navigateAwayFromCalendarCreateWorkspace(destinationHref);
        return;
      }

      router.push(destinationHref, { scroll: false });
    },
    [destinationHref, href, interceptNavigate, isActive, pathname, router],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (shouldLeaveCalendarViaNativeLink() && !isActive) {
        return;
      }

      if (isActive && !shouldCommitNavigationGesture()) {
        event.preventDefault();
        return;
      }

      if (!event.isPrimary) {
        return;
      }

      navigatedThisGestureRef.current = false;
      activeGestureRef.current = {
        pointerId: event.pointerId,
        cancelled: false,
      };
    },
    [isActive, shouldCommitNavigationGesture, shouldLeaveCalendarViaNativeLink],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (shouldLeaveCalendarViaNativeLink() && !isActive) {
        return;
      }

      const gesture = activeGestureRef.current;

      if (
        (!shouldCommitNavigationGesture() && isActive) ||
        !gesture ||
        event.pointerId !== gesture.pointerId ||
        gesture.cancelled
      ) {
        return;
      }

      activeGestureRef.current = null;

      if (event.pointerType === "touch") {
        commitNavigation();
      }
    },
    [commitNavigation, isActive, shouldCommitNavigationGesture, shouldLeaveCalendarViaNativeLink],
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    const gesture = activeGestureRef.current;

    if (gesture && event.pointerId === gesture.pointerId) {
      gesture.cancelled = true;
      activeGestureRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (shouldLeaveCalendarViaNativeLink() && !isActive) {
        if (href === EVENTS_AREA_SUB_NAV.gigs.href) {
          clearGigsListTabPending();
        }

        if (
          isEventsWorkspacePath(pathname) &&
          href !== EVENTS_AREA_SUB_NAV.events.href
        ) {
          clearEventsListTabCache();
        }

        return;
      }

      if (shouldCommitNavigationGesture()) {
        event.preventDefault();

        if (!navigatedThisGestureRef.current) {
          commitNavigation();
        }

        return;
      }

      if (isActive) {
        event.preventDefault();
        return;
      }

      if (navigatedThisGestureRef.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      commitNavigation();
    },
    [commitNavigation, href, isActive, shouldCommitNavigationGesture, shouldLeaveCalendarViaNativeLink],
  );

  return (
    <Link
      href={destinationHref}
      prefetch
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      className={PLANNER_WORKSPACE_SUB_NAV_HIT_CLASS}
    >
      <span
        className={`${PLANNER_WORKSPACE_SUB_NAV_PILL_CLASS} ${isActive ? "ftc-filter-pill-active" : ""} pointer-events-none`}
      >
        {children}
      </span>
    </Link>
  );
}
