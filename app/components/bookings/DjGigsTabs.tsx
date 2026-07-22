"use client";

import Link from "next/link";
import type { DjGigsListTab } from "@/lib/bookingRequests";
import {
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_GAP_CLASS,
  GIGS_TAB_PILL_ROW_CLASS,
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
  showCountBadge?: boolean;
}[] = [
  { value: "pending", label: "Incoming", showCountBadge: true },
  { value: "accepted", label: "Confirmed", showCountBadge: true },
  { value: "history", label: "History", showHistoryIcon: true, showCountBadge: false },
];

function DjGigsTabCount({
  count,
  countsReady,
}: {
  count: number;
  countsReady: boolean;
}) {
  const digits = countsReady && count > 0 ? String(count) : "";

  return (
    <span aria-hidden={!digits} className={GIGS_TAB_COUNT_SLOT_CLASS}>
      {digits}
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
  const countsReady = counts !== null;

  return (
    <div className={GIGS_TAB_PILL_ROW_CLASS} aria-busy={counts === null ? true : undefined}>
      {GIGS_TAB_CONFIG.map((tab) => {
        const isActive = activeView === tab.value;
        const href = buildGigsListHref(tab.value);
        const count = counts?.[tab.value] ?? 0;
        const showCountBadge = tab.showCountBadge === true;
        const ariaLabel =
          showCountBadge && countsReady && count > 0 ? `${tab.label} ${count}` : tab.label;

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
            {showCountBadge ? (
              <DjGigsTabCount count={count} countsReady={countsReady} />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
