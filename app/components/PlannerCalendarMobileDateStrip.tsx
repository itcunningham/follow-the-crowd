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

const SCROLL_DURATION_MS = 175;
const SCROLL_END_DEBOUNCE_MS = 80;

type PlannerCalendarMobileDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  monthStart: Date;
  itemsByDate: Map<string, CalendarItem[]>;
};

function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[(date.getDay() + 6) % 7];
}

function getCenteredScrollLeft(container: HTMLElement, chip: HTMLElement): number {
  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  const targetLeft = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
  return Math.min(Math.max(0, targetLeft), maxScrollLeft);
}

function animateScrollLeft(
  container: HTMLElement,
  targetLeft: number,
  duration: number,
  onComplete?: () => void,
): number {
  const startLeft = container.scrollLeft;
  const distance = targetLeft - startLeft;

  if (Math.abs(distance) < 1) {
    onComplete?.();
    return 0;
  }

  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    container.scrollLeft = startLeft + distance * eased;

    if (progress < 1) {
      frameId = requestAnimationFrame(step);
      return;
    }

    onComplete?.();
  }

  let frameId = requestAnimationFrame(step);
  return frameId;
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
  const scrollAnimationFrameRef = useRef(0);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const skipNextSmoothScrollRef = useRef(false);
  const [chipWidth, setChipWidth] = useState<number | null>(null);

  const monthDates = useMemo(() => getCalendarMonthDates(monthStart), [monthStart]);

  const cancelScrollAnimation = useCallback(() => {
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = 0;
    }
  }, []);

  const beginProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
  }, []);

  const endProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = false;
  }, []);

  const scrollToDate = useCallback(
    (date: Date, options?: { instant?: boolean }) => {
      const chip = chipRefs.current.get(toDateKey(date));
      const container = scrollRef.current;

      if (!chip || !container) {
        return;
      }

      const targetLeft = getCenteredScrollLeft(container, chip);

      if (Math.abs(container.scrollLeft - targetLeft) < 1) {
        return;
      }

      cancelScrollAnimation();
      beginProgrammaticScroll();

      if (options?.instant) {
        container.scrollLeft = targetLeft;
        endProgrammaticScroll();
        return;
      }

      scrollAnimationFrameRef.current = animateScrollLeft(
        container,
        targetLeft,
        SCROLL_DURATION_MS,
        () => {
          scrollAnimationFrameRef.current = 0;
          endProgrammaticScroll();
        },
      );
    },
    [beginProgrammaticScroll, cancelScrollAnimation, endProgrammaticScroll],
  );

  const findNearestDateToCenter = useCallback((): Date | null => {
    const container = scrollRef.current;

    if (!container) {
      return null;
    }

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let nearestDate: Date | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const date of monthDates) {
      const chip = chipRefs.current.get(toDateKey(date));

      if (!chip) {
        continue;
      }

      const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
      const distance = Math.abs(chipCenter - containerCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestDate = date;
      }
    }

    return nearestDate;
  }, [monthDates]);

  const snapNearestDateToCenter = useCallback(() => {
    if (programmaticScrollRef.current) {
      return;
    }

    const nearestDate = findNearestDateToCenter();

    if (!nearestDate) {
      return;
    }

    if (!isSameDay(nearestDate, selectedDate)) {
      onSelectDate(nearestDate);
      return;
    }

    scrollToDate(nearestDate);
  }, [findNearestDateToCenter, onSelectDate, scrollToDate, selectedDate]);

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

    scrollToDate(selectedDate, { instant: true });
    skipNextSmoothScrollRef.current = true;
  }, [monthDates, monthStart, scrollToDate]);

  useEffect(() => {
    if (!isSameMonth(selectedDate, monthStart)) {
      return;
    }

    if (skipNextSmoothScrollRef.current) {
      skipNextSmoothScrollRef.current = false;
      return;
    }

    scrollToDate(selectedDate);
  }, [monthStart, selectedDate, scrollToDate]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    function handleScrollEnd() {
      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current);
        scrollEndTimeoutRef.current = null;
      }

      snapNearestDateToCenter();
    }

    function handleScroll() {
      if (programmaticScrollRef.current) {
        return;
      }

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }

      scrollEndTimeoutRef.current = window.setTimeout(handleScrollEnd, SCROLL_END_DEBOUNCE_MS);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("scrollend", handleScrollEnd);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("scrollend", handleScrollEnd);

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [snapNearestDateToCenter]);

  useEffect(() => {
    return () => {
      cancelScrollAnimation();

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [cancelScrollAnimation]);

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
