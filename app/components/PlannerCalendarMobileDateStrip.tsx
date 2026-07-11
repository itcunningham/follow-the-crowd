"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatPlannerAgendaDateLabel,
  getConsecutiveCalendarDates,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarItem,
} from "@/lib/calendar";

const TIMELINE_DAYS_BEFORE = 180;
const TIMELINE_DAYS_AFTER = 180;
const DATE_CHIP_SCROLL_CLASS =
  "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type PlannerCalendarMobileDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  monthStart: Date;
  onVisibleMonthChange: (monthStart: Date) => void;
  itemsByDate: Map<string, CalendarItem[]>;
  isDateInViewingMonth: (date: Date) => boolean;
};

function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[(date.getDay() + 6) % 7];
}

export default function PlannerCalendarMobileDateStrip({
  selectedDate,
  onSelectDate,
  monthStart,
  onVisibleMonthChange,
  itemsByDate,
  isDateInViewingMonth,
}: PlannerCalendarMobileDateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const programmaticScrollRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollResetTimeoutRef = useRef<number | null>(null);
  const [timelineAnchor, setTimelineAnchor] = useState(() => new Date(selectedDate));
  const [chipWidth, setChipWidth] = useState<number | null>(null);

  const timelineDates = useMemo(
    () => getConsecutiveCalendarDates(timelineAnchor, TIMELINE_DAYS_BEFORE, TIMELINE_DAYS_AFTER),
    [timelineAnchor],
  );

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

    const targetLeft = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior,
    });

    scrollResetTimeoutRef.current = window.setTimeout(
      () => {
        programmaticScrollRef.current = false;
      },
      behavior === "smooth" ? 450 : 0,
    );
  }, []);

  const updateVisibleMonthFromScroll = useCallback(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const centerX = container.scrollLeft + container.clientWidth / 2;
    let closestDate: Date | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const date of timelineDates) {
      const chip = chipRefs.current.get(toDateKey(date));

      if (!chip) {
        continue;
      }

      const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
      const distance = Math.abs(chipCenter - centerX);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestDate = date;
      }
    }

    if (!closestDate) {
      return;
    }

    onVisibleMonthChange(new Date(closestDate.getFullYear(), closestDate.getMonth(), 1));
  }, [onVisibleMonthChange, timelineDates]);

  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current) {
      return;
    }

    if (scrollFrameRef.current !== null) {
      return;
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateVisibleMonthFromScroll();
    });
  }, [updateVisibleMonthFromScroll]);

  useEffect(() => {
    const selectedInTimeline = timelineDates.some((date) => isSameDay(date, selectedDate));

    if (!selectedInTimeline) {
      setTimelineAnchor(new Date(selectedDate));
    }
  }, [selectedDate, timelineDates]);

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
    scrollToDate(selectedDate, "instant");
  }, [selectedDate, timelineAnchor, scrollToDate]);

  useEffect(() => {
    if (!isSameMonth(selectedDate, monthStart)) {
      return;
    }

    scrollToDate(selectedDate, "smooth");
  }, [monthStart, selectedDate, scrollToDate]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      if (scrollResetTimeoutRef.current !== null) {
        window.clearTimeout(scrollResetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={`-mx-4 flex gap-1 px-4 ${DATE_CHIP_SCROLL_CLASS}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {timelineDates.map((date) => {
        const dateKey = toDateKey(date);
        const isSelected = isSameDay(date, selectedDate);
        const hasEvents = (itemsByDate.get(dateKey) ?? []).length > 0;
        const inViewingMonth = isDateInViewingMonth(date);

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
            aria-label={formatPlannerAgendaDateLabel(date)}
            onClick={() => onSelectDate(date)}
            style={chipWidth ? { width: chipWidth, minWidth: chipWidth } : undefined}
            className={`flex shrink-0 flex-col items-center rounded-xl border px-1 py-2 transition ${
              chipWidth ? "" : "w-[calc((100%-1.5rem)/7)] min-w-[calc((100%-1.5rem)/7)]"
            } ${
              isSelected
                ? "border-transparent bg-ftc-primary text-ftc-bg"
                : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong"
            } ${inViewingMonth ? "" : "opacity-60"}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {getWeekdayLabel(date)}
            </span>
            <span className="mt-1 text-sm font-semibold tabular-nums">{date.getDate()}</span>
            {hasEvents ? (
              <span
                aria-hidden="true"
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  isSelected ? "bg-ftc-bg" : "bg-ftc-primary"
                }`}
              />
            ) : (
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
