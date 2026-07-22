"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type ReactNode } from "react";

const PLANNER_WORKSPACE_SUB_NAV_HIT_CLASS =
  "relative inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation";

const PLANNER_WORKSPACE_SUB_NAV_PILL_CLASS = "inline-flex items-center gap-1.5 ftc-filter-pill";

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
  const navigatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{ pointerId: number; cancelled: boolean } | null>(null);

  const tryNavigate = useCallback(() => {
    if (interceptNavigate?.(href)) {
      navigatedThisGestureRef.current = true;
      return;
    }

    if (navigatedThisGestureRef.current || isActive) {
      return;
    }

    navigatedThisGestureRef.current = true;
    router.push(href, { scroll: false });
  }, [href, interceptNavigate, isActive, router]);

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
        event.preventDefault();
        tryNavigate();
      }
    },
    [interceptNavigate, isActive, tryNavigate],
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
        tryNavigate();
        return;
      }

      if (isActive) {
        event.preventDefault();
        return;
      }

      if (navigatedThisGestureRef.current) {
        event.preventDefault();
      }
    },
    [interceptNavigate, isActive, tryNavigate],
  );

  return (
    <Link
      href={href}
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
