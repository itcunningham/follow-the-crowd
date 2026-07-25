"use client";

import {
  formatGigsTabCountAriaCount,
  formatGigsTabCountDisplay,
  shouldRenderGigsTabCount,
} from "@/lib/bookings/gigsTabCountDisplay";
import { WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS } from "@/lib/design/workspaceSubNavBadge";

export function WorkspaceGigsPendingBadge({
  count,
  isActive,
}: {
  count: number;
  isActive: boolean;
}) {
  if (!shouldRenderGigsTabCount(count)) {
    return null;
  }

  const display = formatGigsTabCountDisplay(count);
  const badgeToneClass = isActive
    ? "bg-ftc-bg/20 text-ftc-bg"
    : "bg-ftc-primary/15 text-ftc-primary";

  return (
    <span
      className={`${WORKSPACE_GIGS_PENDING_BADGE_SLOT_CLASS} ${badgeToneClass}`.trim()}
      aria-label={`${formatGigsTabCountAriaCount(count)} pending incoming gig${count === 1 ? "" : "s"}`}
    >
      {display}
    </span>
  );
}
