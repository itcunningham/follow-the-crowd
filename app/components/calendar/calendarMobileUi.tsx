"use client";

import { useEffect, useState } from "react";

export const CALENDAR_MOBILE_INTERACTIVE_PRESS_CLASS =
  "active:scale-[0.98] transition duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none";

export const CALENDAR_MOBILE_AGENDA_TRANSITION_MS = 175;

export const CALENDAR_MOBILE_AGENDA_TRANSITION_CLASS =
  "transition-all duration-[175ms] ease-out motion-reduce:transition-none";

export const CALENDAR_MOBILE_SELECTED_DAY_HEADING_CLASS =
  "text-base font-semibold text-ftc-text";

export const CALENDAR_MOBILE_SELECTED_DAY_TODAY_CLASS =
  "mt-0.5 text-xs font-medium uppercase tracking-wide text-ftc-text-secondary";

export const CALENDAR_MOBILE_EMPTY_STATE_CLASS =
  "rounded-xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-4 py-6 text-center";

export const CALENDAR_MOBILE_EMPTY_STATE_TEXT_CLASS = "text-sm text-ftc-text-muted";

function CalendarMobileEmptyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="mx-auto mb-2 h-4 w-4 text-ftc-text-muted/70"
    >
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarMobileSelectedDayHeader({
  dateLabel,
  showToday,
}: {
  dateLabel: string;
  showToday: boolean;
}) {
  return (
    <>
      <h2 className={CALENDAR_MOBILE_SELECTED_DAY_HEADING_CLASS}>{dateLabel}</h2>
      {showToday ? (
        <p className={CALENDAR_MOBILE_SELECTED_DAY_TODAY_CLASS}>Today</p>
      ) : null}
    </>
  );
}

export function CalendarMobileDashedEmptyState({ message }: { message: string }) {
  return (
    <div className={CALENDAR_MOBILE_EMPTY_STATE_CLASS}>
      <CalendarMobileEmptyIcon />
      <p className={CALENDAR_MOBILE_EMPTY_STATE_TEXT_CLASS}>{message}</p>
    </div>
  );
}

export function useCalendarMobileAgendaTransition(selectedDateKey: string) {
  const [displayDateKey, setDisplayDateKey] = useState(selectedDateKey);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (selectedDateKey === displayDateKey) {
      return;
    }

    setVisible(false);

    const transitionTimer = window.setTimeout(() => {
      setDisplayDateKey(selectedDateKey);
      setVisible(true);
    }, CALENDAR_MOBILE_AGENDA_TRANSITION_MS);

    return () => {
      window.clearTimeout(transitionTimer);
    };
  }, [displayDateKey, selectedDateKey]);

  const transitionClassName = `${CALENDAR_MOBILE_AGENDA_TRANSITION_CLASS} ${
    visible
      ? "translate-y-0 opacity-100"
      : "pointer-events-none translate-y-1 opacity-0"
  }`;

  return { displayDateKey, transitionClassName };
}
