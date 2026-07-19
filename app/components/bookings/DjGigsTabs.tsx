"use client";

import Link from "next/link";
import type { BookingRequest } from "@/lib/bookingRequests";
import { countDjGigsByTab, type DjGigsListTab } from "@/lib/bookingRequests";
import {
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_CLASS,
  ftcFilterPillClass,
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
  minWidthClass: string;
}[] = [
  { value: "pending", label: "Incoming", minWidthClass: "min-w-[7.25rem]" },
  { value: "accepted", label: "Confirmed", minWidthClass: "min-w-[7.5rem]" },
  {
    value: "history",
    label: "History",
    showHistoryIcon: true,
    minWidthClass: "min-w-[7rem]",
  },
];

function DjGigsTabCount({ count, ready }: { count: number; ready: boolean }) {
  const visibleCount = ready && count > 0 ? count : null;

  return (
    <span aria-hidden={visibleCount == null} className={GIGS_TAB_COUNT_SLOT_CLASS}>
      {visibleCount ?? ""}
    </span>
  );
}

export function DjGigsTabs({
  activeView,
  ready,
  bookings = [],
  hiddenBookingIds = new Set<string>(),
}: {
  activeView: DjGigsListTab;
  ready: boolean;
  bookings?: BookingRequest[];
  hiddenBookingIds?: ReadonlySet<string>;
}) {
  const counts = ready ? countDjGigsByTab(bookings, hiddenBookingIds) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {GIGS_TAB_CONFIG.map((tab) => {
        const isActive = activeView === tab.value;
        const href = buildGigsListHref(tab.value);
        const count = counts?.[tab.value] ?? 0;
        const ariaLabel =
          ready && count > 0 ? `${tab.label} ${count}` : tab.label;

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
            className={`${GIGS_TAB_PILL_CLASS} ${tab.minWidthClass} ${ftcFilterPillClass(isActive)}`}
          >
            {tab.showHistoryIcon ? <HistoryIcon /> : null}
            <span className="inline-flex items-baseline">
              <span>{tab.label}</span>
              <DjGigsTabCount count={count} ready={ready} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
