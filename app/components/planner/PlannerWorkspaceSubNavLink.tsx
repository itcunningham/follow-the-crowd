"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type ReactNode } from "react";
import { setPendingWorkspaceHref } from "@/lib/plannerWorkspaceNavPending";

const PLANNER_WORKSPACE_SUB_NAV_LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 touch-manipulation ftc-filter-pill";

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
  const activatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{ pointerId: number; cancelled: boolean } | null>(null);

  const beginActivation = useCallback(() => {
    setPendingWorkspaceHref(href);
  }, [href]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (!event.isPrimary || isActive) {
        return;
      }

      activatedThisGestureRef.current = false;
      activeGestureRef.current = {
        pointerId: event.pointerId,
        cancelled: false,
      };
      beginActivation();
    },
    [beginActivation, isActive],
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
        activatedThisGestureRef.current = true;
        router.push(href);
      }
    },
    [href, isActive, router],
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
      if (isActive) {
        event.preventDefault();
        return;
      }

      if (activatedThisGestureRef.current) {
        event.preventDefault();
        return;
      }

      beginActivation();
    },
    [beginActivation, isActive],
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
      className={`${PLANNER_WORKSPACE_SUB_NAV_LINK_CLASS} ${isActive ? "ftc-filter-pill-active" : ""}`}
    >
      <span className="pointer-events-none inline-flex items-center gap-1.5">{children}</span>
    </Link>
  );
}
