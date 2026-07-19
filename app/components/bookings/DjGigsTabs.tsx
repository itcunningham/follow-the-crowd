"use client";

import Link from "next/link";
import type { DjGigsListTab } from "@/lib/bookingRequests";
import { SkeletonBlock } from "@/app/components/skeleton/Skeleton";
import {
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_GAP_CLASS,
  GIGS_TAB_PILL_ROW_CLASS,
  GIGS_TAB_SKELETON_PILL_CLASS,
  GIGS_TAB_SKELETON_PILL_WIDTHS,
  gigsTabPillClass,
} from "@/lib/design/ftcDesignSystem";
import { buildGigsListHref } from "@/lib/bookings/gigsListNavigation";

function HistoryIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const GIGS_TAB_CONFIG: {
  value: DjGigsListTab;
  label: string;
  showHistoryIcon?: boolean;
}[] = [
  { value: "pending", label: "Incoming" },
  { value: "accepted", label: "Confirmed" },
  { value: "history", label: "History", showHistoryIcon: true },
];

export function DjGigsTabsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading Gigs tabs"
      className={GIGS_TAB_PILL_ROW_CLASS}
    >
      {GIGS_TAB_SKELETON_PILL_WIDTHS.map((widthClass) => (
        <SkeletonBlock
          key={widthClass}
          rounded="rounded-full"
          className={`${GIGS_TAB_SKELETON_PILL_CLASS} ${widthClass}`}
        />
      ))}
    </div>
  );
}

function DjGigsTabCount({
  count,
  reserveSlot,
}: {
  count: number;
  reserveSlot: boolean;
}) {
  const visibleCount = count > 0 ? ` ${count}` : "";

  if (!reserveSlot) {
    if (!visibleCount) {
      return null;
    }

    return (
      <span aria-hidden className="tabular-nums">
        {visibleCount}
      </span>
    );
  }

  return (
    <span aria-hidden={!visibleCount} className={GIGS_TAB_COUNT_SLOT_CLASS}>
      {visibleCount}
    </span>
  );
}

export function DjGigsTabs({
  activeView,
  counts,
}: {
  activeView: DjGigsListTab;
  counts: Record<DjGigsListTab, number> | null;
}) {
  if (counts === null) {
    return <DjGigsTabsSkeleton />;
  }

  return (
    <div className={GIGS_TAB_PILL_ROW_CLASS}>
      {GIGS_TAB_CONFIG.map((tab) => {
        const isActive = activeView === tab.value;
        const href = buildGigsListHref(tab.value);
        const count = counts[tab.value];
        const ariaLabel = count > 0 ? `${tab.label} ${count}` : tab.label;
        const reserveCountSlot = tab.value !== "history";

        return (
          <Link
            key={tab.value}
            href={href}
            aria-label={ariaLabel}
            aria-current={isActive ? "page" : undefined}
            onClick={(event) => {
              if (isActive) {
                event.preventDefault();
              }
            }}
            className={`inline-flex items-center ${GIGS_TAB_PILL_GAP_CLASS} ${gigsTabPillClass(isActive)}`}
          >
            {tab.showHistoryIcon ? <HistoryIcon /> : null}
            {tab.label}
            <DjGigsTabCount count={count} reserveSlot={reserveCountSlot} />
          </Link>
        );
      })}
    </div>
  );
}
