"use client";

import { formatGigsTabCountAriaCount, formatGigsTabCountDisplay } from "@/lib/bookings/gigsTabCountDisplay";
import { WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS } from "@/lib/design/workspaceSubNavBadge";

export function WorkspaceGigsPendingBadge({
  count,
  isActive,
}: {
  count: number;
  isActive: boolean;
}) {
  const display = formatGigsTabCountDisplay(count);
  const badgeToneClass =
    display != null
      ? isActive
        ? "bg-ftc-bg/20 text-ftc-bg"
        : "bg-ftc-primary/15 text-ftc-primary"
      : "";

  return (
    <span
      className={`${WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS} ${badgeToneClass}`.trim()}
      aria-hidden={display == null ? true : undefined}
      aria-label={
        display != null
          ? `${formatGigsTabCountAriaCount(count)} pending incoming gig${count === 1 ? "" : "s"}`
          : undefined
      }
    >
      {display ?? ""}
    </span>
  );
}
