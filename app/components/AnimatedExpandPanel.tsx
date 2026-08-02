"use client";

import type { ReactNode } from "react";

/**
 * Animates a panel open/closed by driving `grid-template-rows` between `0fr`
 * and `1fr` on a single-track grid, so the browser's own layout does the
 * height measurement — no `ResizeObserver`, no reading `scrollHeight`, and no
 * height that can drift out of sync with content that changes while closed.
 * `motion-reduce:transition-none` respects the OS-level reduced-motion
 * preference; the content still shows/hides, just without the animation.
 *
 * Extracted from `BookingRequestCard`'s card-level expand/collapse so a
 * second consumer (the Run Sheet's per-row accordion) doesn't reimplement it.
 *
 * `dataAttribute` names the marker attribute placed on the outer node,
 * defaulting to a generic one. `BookingRequestCard` passes its own
 * `DM_BOOKING_CARD_EXPAND_PANEL_ATTR` explicitly so this extraction doesn't
 * change the attribute name `lib/dm/dmBookingCardExpandScroll.ts` already
 * queries by, for the DM scroll-to-booking behaviour.
 */
export default function AnimatedExpandPanel({
  open,
  children,
  dataAttribute = "data-animated-expand-panel",
}: {
  open: boolean;
  children: ReactNode;
  dataAttribute?: string;
}) {
  return (
    <div
      {...{ [dataAttribute]: "" }}
      className={`grid min-h-0 transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        open ? "opacity-100" : "opacity-0"
      }`}
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className={open ? "min-h-0 overflow-x-hidden" : "min-h-0 overflow-hidden"}>{children}</div>
    </div>
  );
}
