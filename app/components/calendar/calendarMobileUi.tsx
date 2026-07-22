"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { PLANNER_CALENDAR_TITLE_VENUE_SEPARATOR } from "@/lib/calendar";

export const CALENDAR_MOBILE_INTERACTIVE_PRESS_CLASS =
  "active:scale-[0.98] transition duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none";

export const CALENDAR_MOBILE_AGENDA_TRANSITION_MS = 175;

export const CALENDAR_MOBILE_AGENDA_TRANSITION_CLASS =
  "transition-all duration-[175ms] ease-out motion-reduce:transition-none";

export const CALENDAR_MOBILE_SELECTED_DAY_HEADING_CLASS =
  "text-base font-semibold text-ftc-text";

export const CALENDAR_MOBILE_SELECTED_DAY_STATUS_ROW_CLASS =
  "mt-0.5 flex h-4 items-center";

export const CALENDAR_MOBILE_SELECTED_DAY_TODAY_CLASS =
  "text-xs font-medium uppercase tracking-wide text-ftc-text-secondary";

export const CALENDAR_MOBILE_EMPTY_STATE_CLASS =
  "flex flex-col items-center justify-center rounded-xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-4 py-4 text-center";

export const CALENDAR_MOBILE_EMPTY_STATE_TEXT_CLASS = "text-sm text-ftc-text-muted";

export const CALENDAR_MOBILE_AGENDA_CARD_LIST_CLASS = "mt-3 space-y-2";

export const CALENDAR_MOBILE_AGENDA_CARD_SHELL_CLASS =
  "relative z-0 block w-full min-h-[4.75rem] rounded-xl px-3 py-2.5 text-left";

export const CALENDAR_MOBILE_AGENDA_CARD_BODY_CLASS = "flex items-stretch gap-3";

export const CALENDAR_MOBILE_AGENDA_CARD_LEADING_CLASS = "w-1 shrink-0 self-stretch rounded-full";

export const CALENDAR_MOBILE_AGENDA_CARD_LEADING_SPACER_CLASS =
  "w-1 shrink-0 self-stretch rounded-full opacity-0 pointer-events-none";

export const CALENDAR_MOBILE_AGENDA_CARD_CONTENT_CLASS = "min-w-0 flex-1 py-px";

export const CALENDAR_MOBILE_AGENDA_CARD_HEADER_ROW_CLASS =
  "flex min-w-0 items-center justify-between gap-2 overflow-hidden";

export const CALENDAR_MOBILE_AGENDA_CARD_TITLE_SLOT_CLASS = "min-w-0 flex-1 overflow-hidden";

/** Flex row: event name ellipsizes before the venue suffix (avoids "Title · …" from one-node ellipsis). */
export const CALENDAR_MOBILE_AGENDA_CARD_TITLE_ROW_CLASS =
  "flex min-w-0 w-full items-baseline overflow-hidden";

export const CALENDAR_MOBILE_AGENDA_CARD_TITLE_SEGMENT_CLASS =
  "overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-ftc-text";

/** Event-only titles (e.g. Gigs calendar booking name). */
export const CALENDAR_MOBILE_AGENDA_CARD_TITLE_CLASS = `block min-w-0 ${CALENDAR_MOBILE_AGENDA_CARD_TITLE_SEGMENT_CLASS}`;

export const CALENDAR_MOBILE_AGENDA_CARD_TITLE_EVENT_CLASS = "min-w-0 flex-1 shrink basis-0";

export const CALENDAR_MOBILE_AGENDA_CARD_TITLE_VENUE_CLASS = "min-w-0 max-w-[55%] shrink";

export const CALENDAR_MOBILE_AGENDA_CARD_BADGE_SLOT_CLASS =
  "flex shrink-0 basis-[5.75rem] justify-end self-center";

export const CALENDAR_MOBILE_AGENDA_CARD_TIME_SLOT_CLASS = "mt-1.5";

export function CompactCalendarEventVenueTitle({
  eventName,
  venue,
  className,
}: {
  eventName: string;
  venue?: string | null;
  /** Typography classes for title segments (defaults to agenda card segment styles). */
  className?: string;
}) {
  const title = eventName.trim() || "Untitled event";
  const trimmedVenue = venue?.trim() || null;
  const segmentClass = className ?? CALENDAR_MOBILE_AGENDA_CARD_TITLE_SEGMENT_CLASS;

  if (!trimmedVenue) {
    return <span className={`${segmentClass} block min-w-0`}>{title}</span>;
  }

  return (
    <span className={CALENDAR_MOBILE_AGENDA_CARD_TITLE_ROW_CLASS}>
      <span
        className={`${CALENDAR_MOBILE_AGENDA_CARD_TITLE_EVENT_CLASS} ${segmentClass}`}
      >
        {title}
      </span>
      <span className={`${CALENDAR_MOBILE_AGENDA_CARD_TITLE_VENUE_CLASS} ${segmentClass}`}>
        {PLANNER_CALENDAR_TITLE_VENUE_SEPARATOR}
        {trimmedVenue}
      </span>
    </span>
  );
}

type CalendarMobileAgendaCardProps = {
  shellClassName?: string;
  leading?: ReactNode;
  reserveLeadingSpace?: boolean;
  badge: ReactNode;
  heading: ReactNode;
  time?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function CalendarMobileAgendaCard({
  shellClassName = "",
  leading,
  reserveLeadingSpace = false,
  badge,
  heading,
  time,
  className = "",
  type = "button",
  ...buttonProps
}: CalendarMobileAgendaCardProps) {
  return (
    <button
      type={type}
      {...buttonProps}
      className={[CALENDAR_MOBILE_AGENDA_CARD_SHELL_CLASS, shellClassName, className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="pointer-events-none block w-full">
        <span className={CALENDAR_MOBILE_AGENDA_CARD_BODY_CLASS}>
          {leading ??
            (reserveLeadingSpace ? (
              <span aria-hidden="true" className={CALENDAR_MOBILE_AGENDA_CARD_LEADING_SPACER_CLASS} />
            ) : null)}
          <span className={CALENDAR_MOBILE_AGENDA_CARD_CONTENT_CLASS}>
            <span className={CALENDAR_MOBILE_AGENDA_CARD_HEADER_ROW_CLASS}>
              <span className={CALENDAR_MOBILE_AGENDA_CARD_TITLE_SLOT_CLASS}>{heading}</span>
              <span className={CALENDAR_MOBILE_AGENDA_CARD_BADGE_SLOT_CLASS}>{badge}</span>
            </span>
            {time ? (
              <span className={CALENDAR_MOBILE_AGENDA_CARD_TIME_SLOT_CLASS}>{time}</span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}

function CalendarMobileEmptyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="mx-auto mb-1.5 h-4 w-4 text-ftc-text-muted/70"
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
      <p
        className={`${CALENDAR_MOBILE_SELECTED_DAY_STATUS_ROW_CLASS} ${CALENDAR_MOBILE_SELECTED_DAY_TODAY_CLASS} ${
          showToday ? "" : "invisible"
        }`}
        aria-hidden={showToday ? undefined : true}
      >
        Today
      </p>
    </>
  );
}

export function CalendarMobileDashedEmptyState({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div className={CALENDAR_MOBILE_EMPTY_STATE_CLASS}>
      <CalendarMobileEmptyIcon />
      <p
        className={
          hint
            ? "text-sm font-medium text-ftc-text-secondary"
            : CALENDAR_MOBILE_EMPTY_STATE_TEXT_CLASS
        }
      >
        {message}
      </p>
      {hint ? <p className="mt-1.5 text-sm text-ftc-text-muted">{hint}</p> : null}
    </div>
  );
}

export function useCalendarMobileAgendaTransition(selectedDateKey: string) {
  const [displayDateKey, setDisplayDateKey] = useState(selectedDateKey);
  const [visible, setVisible] = useState(true);
  const hasCompletedInitialSettleRef = useRef(false);

  useEffect(() => {
    if (selectedDateKey === displayDateKey) {
      setVisible(true);
      hasCompletedInitialSettleRef.current = true;
      return;
    }

    if (!hasCompletedInitialSettleRef.current) {
      setDisplayDateKey(selectedDateKey);
      setVisible(true);
      hasCompletedInitialSettleRef.current = true;
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

  const isSettled = visible && selectedDateKey === displayDateKey;

  const transitionClassName = isSettled
    ? ""
    : `${CALENDAR_MOBILE_AGENDA_TRANSITION_CLASS} ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none [&_*]:pointer-events-none translate-y-1 opacity-0"
      }`;

  return {
    displayDateKey,
    transitionClassName,
    isAgendaTransitionInteractive: isSettled,
  };
}
