"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, type ReactNode } from "react";
import {
  buildWorkspaceSubNavDestinationHref,
  EVENTS_AREA_SUB_NAV,
  isCalendarWorkspacePath,
} from "@/lib/plannerEventsNav";

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

  const commitNavigation = useCallback(
    (fromTouch: boolean) => {
      if (interceptNavigate?.(destinationHref)) {
        navigatedThisGestureRef.current = true;
        return;
      }

      if (navigatedThisGestureRef.current || isActive) {
        return;
      }

      navigatedThisGestureRef.current = true;

      if (fromTouch) {
        window.location.assign(destinationHref);
        return;
      }

      router.push(destinationHref, { scroll: false });
    },
    [destinationHref, interceptNavigate, isActive, router],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (isActive && !interceptNavigate) {
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
    [interceptNavigate, isActive],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      const gesture = activeGestureRef.current;

      if (
        (!interceptNavigate && isActive) ||
        !gesture ||
        event.pointerId !== gesture.pointerId ||
        gesture.cancelled
      ) {
        return;
      }

      activeGestureRef.current = null;

      if (event.pointerType === "touch") {
        commitNavigation(true);
      }
    },
    [commitNavigation, interceptNavigate, isActive],
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
      if (interceptNavigate) {
        event.preventDefault();
        commitNavigation(false);
        return;
      }

      if (isActive) {
        event.preventDefault();
        return;
      }

      if (
        isCalendarWorkspacePath(pathname) &&
        href !== EVENTS_AREA_SUB_NAV.calendar.href
      ) {
        event.preventDefault();
        commitNavigation(false);
        return;
      }

      if (navigatedThisGestureRef.current) {
        event.preventDefault();
      }
    },
    [commitNavigation, href, interceptNavigate, isActive, pathname],
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
