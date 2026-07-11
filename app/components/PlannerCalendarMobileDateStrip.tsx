"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatPlannerAgendaDateLabel,
  getCalendarMonthDates,
  getPlannerCalendarDateStripDotClass,
  getPlannerCalendarDateStripExtraCount,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarItem,
} from "@/lib/calendar";

const DATE_CHIP_SCROLL_CLASS =
  "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type PlannerCalendarMobileDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  monthStart: Date;
  itemsByDate: Map<string, CalendarItem[]>;
};

function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[(date.getDay() + 6) % 7];
}

export default function PlannerCalendarMobileDateStrip({
  selectedDate,
  onSelectDate,
  monthStart,
  itemsByDate,
}: PlannerCalendarMobileDateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const programmaticScrollRef = useRef(false);
  const scrollResetTimeoutRef = useRef<number | null>(null);
  const [chipWidth, setChipWidth] = useState<number | null>(null);

  const monthDates = useMemo(() => getCalendarMonthDates(monthStart), [monthStart]);

  const scrollToDate = useCallback((date: Date, behavior: ScrollBehavior = "smooth") => {
    const chip = chipRefs.current.get(toDateKey(date));
    const container = scrollRef.current;

    if (!chip || !container) {
      return;
    }

    programmaticScrollRef.current = true;

    if (scrollResetTimeoutRef.current !== null) {
      window.clearTimeout(scrollResetTimeoutRef.current);
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const targetLeft = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
    container.scrollTo({
      left: Math.min(Math.max(0, targetLeft), maxScrollLeft),
      behavior,
    });

    scrollResetTimeoutRef.current = window.setTimeout(
      () => {
        programmaticScrollRef.current = false;
      },
      behavior === "smooth" ? 450 : 0,
    );
  }, []);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    function updateChipWidth() {
      if (!scrollRef.current) {
        return;
      }

      const nextWidth = (scrollRef.current.clientWidth - 24) / 7;
      setChipWidth(nextWidth > 0 ? nextWidth : null);
    }

    updateChipWidth();

    const observer = new ResizeObserver(updateChipWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!isSameMonth(selectedDate, monthStart)) {
      return;
    }

    scrollToDate(selectedDate, "instant");
  }, [monthDates, monthStart, selectedDate, scrollToDate]);

  useEffect(() => {
    if (!isSameMonth(selectedDate, monthStart)) {
      return;
    }

    scrollToDate(selectedDate, "smooth");
  }, [monthStart, selectedDate, scrollToDate]);

  useEffect(() => {
    return () => {
      if (scrollResetTimeoutRef.current !== null) {
        window.clearTimeout(scrollResetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      className={`-mx-4 flex gap-1 px-4 ${DATE_CHIP_SCROLL_CLASS}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {monthDates.map((date) => {
        const dateKey = toDateKey(date);
        const isSelected = isSameDay(date, selectedDate);
        const dateItems = itemsByDate.get(dateKey) ?? [];
        const hasEvents = dateItems.length > 0;
        const extraItemCount = getPlannerCalendarDateStripExtraCount(dateItems);
        const itemCountLabel =
          dateItems.length > 0
            ? `, ${dateItems.length} scheduled item${dateItems.length === 1 ? "" : "s"}`
            : "";

        return (
          <button
            key={dateKey}
            ref={(element) => {
              if (element) {
                chipRefs.current.set(dateKey, element);
                return;
              }

              chipRefs.current.delete(dateKey);
            }}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${formatPlannerAgendaDateLabel(date)}${itemCountLabel}`}
            onClick={() => onSelectDate(date)}
            style={chipWidth ? { width: chipWidth, minWidth: chipWidth } : undefined}
            className={`flex shrink-0 flex-col items-center rounded-xl border px-1 py-2 transition ${
              chipWidth ? "" : "w-[calc((100%-1.5rem)/7)] min-w-[calc((100%-1.5rem)/7)]"
            } ${
              isSelected
                ? "border-transparent bg-ftc-primary text-ftc-bg"
                : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {getWeekdayLabel(date)}
            </span>
            <span className="mt-1 text-sm font-semibold tabular-nums">{date.getDate()}</span>
            <span
              aria-hidden="true"
              className="mt-1 flex h-3 min-h-3 items-center justify-center gap-px"
            >
              {hasEvents ? (
                <>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${getPlannerCalendarDateStripDotClass(dateItems, isSelected)}`}
                  />
                  {extraItemCount > 0 ? (
                    <span
                      className={`text-[8px] font-medium leading-none ${
                        isSelected ? "text-ftc-bg/65" : "text-ftc-text-muted"
                      }`}
                    >
                      +{extraItemCount}
                    </span>
                  ) : null}
                </>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
