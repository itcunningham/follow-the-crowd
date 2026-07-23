"use client";

import Link from "next/link";
import type { DjGigsListTab } from "@/lib/bookingRequests";
import {
  formatGigsTabCountAriaCount,
  formatGigsTabCountDisplay,
} from "@/lib/bookings/gigsTabCountDisplay";
import {
  GIGS_TAB_COUNT_SLOT_CLASS,
  GIGS_TAB_PILL_GAP_CLASS,
  GIGS_TAB_PILL_LABEL_CLASS,
  GIGS_TAB_PILL_ROW_CLASS,
  eventsListTabPillClass,
  gigsTabPillClass,
} from "@/lib/design/ftcDesignSystem";
import { buildGigsListHref } from "@/lib/bookings/gigsListNavigation";
import { publishGigsListTabPending } from "@/lib/bookings/gigsListTabPending";

const GIGS_TAB_CONFIG: {
  value: DjGigsListTab;
  label: string;
  showCountBadge?: boolean;
}[] = [
  { value: "pending", label: "Incoming", showCountBadge: true },
  { value: "accepted", label: "Confirmed", showCountBadge: true },
  { value: "history", label: "History", showCountBadge: false },
];

function DjGigsTabCount({
  count,
  countsReady,
}: {
  count: number;
  countsReady: boolean;
}) {
  const display = countsReady ? formatGigsTabCountDisplay(count) : null;

  return (
    <span
      className={GIGS_TAB_COUNT_SLOT_CLASS}
      aria-hidden={display == null ? true : undefined}
    >
      {display ?? ""}
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
        const pillClass = showCountBadge
          ? gigsTabPillClass(isActive, true)
          : eventsListTabPillClass(isActive);
        const ariaLabel =
          showCountBadge && countsReady && count > 0
            ? `${tab.label} ${formatGigsTabCountAriaCount(count)}`
            : tab.label;

        return (
          <Link
            key={tab.value}
            href={href}
            aria-label={ariaLabel}
            aria-current={isActive ? "page" : undefined}
            onClick={(event) => {
              if (isActive) {
                event.preventDefault();
                return;
              }

              publishGigsListTabPending(tab.value);
            }}
            className={pillClass}
          >
            {showCountBadge ? (
              <span className={`inline-flex items-center ${GIGS_TAB_PILL_GAP_CLASS}`}>
                <span className={GIGS_TAB_PILL_LABEL_CLASS}>{tab.label}</span>
                <DjGigsTabCount count={count} countsReady={countsReady} />
              </span>
            ) : (
              tab.label
            )}
          </Link>
        );
      })}
    </div>
  );
}
