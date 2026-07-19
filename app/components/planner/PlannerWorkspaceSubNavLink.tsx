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
};

export default function PlannerWorkspaceSubNavLink({
  href,
  isActive,
  children,
}: PlannerWorkspaceSubNavLinkProps) {
  const router = useRouter();
  const navigatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{ pointerId: number; cancelled: boolean } | null>(null);

  const navigate = useCallback(() => {
    if (navigatedThisGestureRef.current || isActive) {
      return;
    }

    navigatedThisGestureRef.current = true;
    router.push(href, { scroll: false });
  }, [href, isActive, router]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (!event.isPrimary || isActive) {
        return;
      }

      navigatedThisGestureRef.current = false;
      activeGestureRef.current = {
        pointerId: event.pointerId,
        cancelled: false,
      };
    },
    [isActive],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      const gesture = activeGestureRef.current;

      if (
        isActive ||
        !gesture ||
        event.pointerId !== gesture.pointerId ||
        gesture.cancelled
      ) {
        return;
      }

      activeGestureRef.current = null;

      if (event.pointerType === "touch") {
        event.preventDefault();
        navigate();
      }
    },
    [isActive, navigate],
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
      if (isActive || navigatedThisGestureRef.current) {
        event.preventDefault();
      }
    },
    [isActive],
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
