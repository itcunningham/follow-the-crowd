"use client";

import { useEffect, type RefObject } from "react";

type SavedBodyStyle = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
};

let lockCount = 0;
let savedScrollY = 0;
let savedBodyStyle: SavedBodyStyle | null = null;

function getScrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

export function lockBodyScroll(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const body = document.body;

    savedBodyStyle = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };

    const scrollbarWidth = getScrollbarWidth();

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined" || lockCount === 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount > 0 || !savedBodyStyle) {
    return;
  }

  const body = document.body;
  const scrollY = savedScrollY;

  body.style.overflow = savedBodyStyle.overflow;
  body.style.position = savedBodyStyle.position;
  body.style.top = savedBodyStyle.top;
  body.style.left = savedBodyStyle.left;
  body.style.right = savedBodyStyle.right;
  body.style.width = savedBodyStyle.width;
  body.style.paddingRight = savedBodyStyle.paddingRight;

  savedBodyStyle = null;
  window.scrollTo(0, scrollY);
}

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [active]);
}

export function usePreventTouchScrollOutside(
  active: boolean,
  allowedRootRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    function handleTouchMove(event: TouchEvent) {
      const allowedRoot = allowedRootRef.current;
      const target = event.target;

      if (allowedRoot && target instanceof Node && allowedRoot.contains(target)) {
        return;
      }

      event.preventDefault();
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [active, allowedRootRef]);
}
