"use client";

import { useEffect, type RefObject } from "react";

const SCROLL_EDGE_TOLERANCE_PX = 1;

export function isScrollableElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const allowsScroll =
    overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";

  return allowsScroll && element.scrollHeight > element.clientHeight + SCROLL_EDGE_TOLERANCE_PX;
}

export function getScrollableAncestorsWithinRoot(
  target: EventTarget | null,
  root: HTMLElement,
): HTMLElement[] {
  const scrollables: HTMLElement[] = [];
  let element: HTMLElement | null =
    target instanceof HTMLElement ? target : null;

  while (element && root.contains(element)) {
    if (isScrollableElement(element)) {
      scrollables.push(element);
    }

    element = element.parentElement;
  }

  if (isScrollableElement(root)) {
    scrollables.push(root);
  }

  return scrollables;
}

export function canScrollInTouchDirection(element: HTMLElement, deltaY: number): boolean {
  if (deltaY === 0) {
    return true;
  }

  // Finger moving down: content moves up, scrollTop decreases.
  if (deltaY > 0) {
    return element.scrollTop > SCROLL_EDGE_TOLERANCE_PX;
  }

  // Finger moving up: content moves down, scrollTop increases.
  return (
    element.scrollTop + element.clientHeight <
    element.scrollHeight - SCROLL_EDGE_TOLERANCE_PX
  );
}

export function shouldPreventModalTouchScroll(
  target: EventTarget | null,
  root: HTMLElement | null,
  deltaY: number,
): boolean {
  if (!root) {
    return true;
  }

  if (!(target instanceof Node) || !root.contains(target)) {
    return true;
  }

  const scrollables = getScrollableAncestorsWithinRoot(target, root);

  if (scrollables.length === 0) {
    return true;
  }

  return !scrollables.some((element) => canScrollInTouchDirection(element, deltaY));
}

export function useModalTouchScrollContainment(
  active: boolean,
  rootRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    let lastTouchY: number | null = null;

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        lastTouchY = null;
        return;
      }

      lastTouchY = event.touches[0].clientY;
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 1 || lastTouchY === null) {
        event.preventDefault();
        return;
      }

      const currentY = event.touches[0].clientY;
      const deltaY = currentY - lastTouchY;
      lastTouchY = currentY;

      if (
        shouldPreventModalTouchScroll(event.target, rootRef.current, deltaY)
      ) {
        event.preventDefault();
      }
    }

    function resetTouchTracking() {
      lastTouchY = null;
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", resetTouchTracking, { passive: true });
    document.addEventListener("touchcancel", resetTouchTracking, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", resetTouchTracking);
      document.removeEventListener("touchcancel", resetTouchTracking);
    };
  }, [active, rootRef]);
}
