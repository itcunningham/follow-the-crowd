"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatPlannerAgendaDateLabel,
  getCalendarMonthDates,
  getPlannerCalendarDateStripDotClass,
  getPlannerCalendarDateStripExtraCount,
  getPlannerCalendarTodayDate,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarItem,
  type CalendarMobileDateStripMarker,
} from "@/lib/calendar";

const DATE_CHIP_SCROLL_CLASS =
  "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const SCROLL_DURATION_MS = 175;
const CENTER_LAYOUT_MAX_ATTEMPTS = 6;

type PlannerCalendarMobileDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  monthStart: Date;
  itemsByDate?: Map<string, CalendarItem[]>;
  getDateMarker?: (dateKey: string, isHighlighted: boolean) => CalendarMobileDateStripMarker | null;
  isDateHighlighted?: (date: Date) => boolean;
};

function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[(date.getDay() + 6) % 7];
}

function getCenteredScrollLeft(container: HTMLElement, chip: HTMLElement): number {
  const containerRect = container.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  const chipCenter = chipRect.left + chipRect.width / 2;
  const containerCenter = containerRect.left + containerRect.width / 2;
  const targetLeft = container.scrollLeft + (chipCenter - containerCenter);
  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);

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

function getDateStripChipClassName(isSelected: boolean, isToday: boolean): string {
  if (isSelected) {
    return isToday
      ? "border-2 border-ftc-bg/45 bg-ftc-primary text-ftc-bg"
      : "border-transparent bg-ftc-primary text-ftc-bg";
  }

  if (isToday) {
    return "border-2 border-ftc-primary/45 bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-primary/65";
  }

  return "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong";
}

function useCalendarTodayDate(): Date {
  const [todayDate, setTodayDate] = useState(() => getPlannerCalendarTodayDate());

  useEffect(() => {
    function syncTodayDate() {
      setTodayDate((current) => {
        const nextToday = getPlannerCalendarTodayDate();
        return isSameDay(current, nextToday) ? current : nextToday;
      });
    }

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const midnightTimerId = window.setTimeout(syncTodayDate, tomorrow.getTime() - now.getTime());

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncTodayDate();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(midnightTimerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [todayDate]);

  return todayDate;
}

function getDateStripScrollCacheKey(monthStart: Date, date: Date): string {
  return `${monthStart.getFullYear()}-${monthStart.getMonth()}:${toDateKey(date)}`;
}

const dateStripScrollPositionCache = new Map<string, number>();

function readCachedDateStripScrollLeft(monthStart: Date, date: Date): number | undefined {
  return dateStripScrollPositionCache.get(getDateStripScrollCacheKey(monthStart, date));
}

function writeCachedDateStripScrollLeft(
  monthStart: Date,
  date: Date,
  scrollLeft: number,
): void {
  dateStripScrollPositionCache.set(getDateStripScrollCacheKey(monthStart, date), scrollLeft);
}

function measureDateStripChipWidth(container: HTMLElement): number | null {
  const nextWidth = (container.clientWidth - 24) / 7;

  return nextWidth > 0 ? nextWidth : null;
}

export default function PlannerCalendarMobileDateStrip({
  selectedDate,
  onSelectDate,
  monthStart,
  itemsByDate,
  getDateMarker,
  isDateHighlighted,
}: PlannerCalendarMobileDateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const selectedDateRef = useRef(selectedDate);
  const scrollAnimationFrameRef = useRef(0);
  const pendingCenterFrameRef = useRef(0);
  const isInitialLayoutRef = useRef(true);
  const previousSelectedDateKeyRef = useRef(toDateKey(selectedDate));
  const previousMonthStartTimeRef = useRef(monthStart.getTime());
  const [chipWidth, setChipWidth] = useState<number | null>(null);
  const todayDate = useCalendarTodayDate();

  selectedDateRef.current = selectedDate;

  const monthDates = useMemo(() => getCalendarMonthDates(monthStart), [monthStart]);

  const cancelScrollAnimation = useCallback(() => {
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = 0;
    }
  }, []);

  const cancelPendingCenterFrames = useCallback(() => {
    if (pendingCenterFrameRef.current) {
      cancelAnimationFrame(pendingCenterFrameRef.current);
      pendingCenterFrameRef.current = 0;
    }
  }, []);

  const scrollToDate = useCallback(
    (date: Date, options?: { instant?: boolean }) => {
      const chip = chipRefs.current.get(toDateKey(date));
      const container = scrollRef.current;

      if (!chip || !container || chip.offsetWidth <= 0) {
        return false;
      }

      const targetLeft = getCenteredScrollLeft(container, chip);

      cancelScrollAnimation();

      if (options?.instant) {
        container.scrollLeft = targetLeft;
        return true;
      }

      if (Math.abs(container.scrollLeft - targetLeft) < 1) {
        return true;
      }

      scrollAnimationFrameRef.current = animateScrollLeft(
        container,
        targetLeft,
        SCROLL_DURATION_MS,
        () => {
          scrollAnimationFrameRef.current = 0;
        },
      );
      return true;
    },
    [cancelScrollAnimation],
  );

  const centerDateWhenReady = useCallback(
    (date: Date, options?: { instant?: boolean }) => {
      cancelPendingCenterFrames();

      if (scrollToDate(date, options)) {
        return;
      }

      let attempts = 1;

      const tryCenter = () => {
        if (scrollToDate(date, options)) {
          pendingCenterFrameRef.current = 0;
          return;
        }

        attempts += 1;

        if (attempts < CENTER_LAYOUT_MAX_ATTEMPTS) {
          pendingCenterFrameRef.current = requestAnimationFrame(tryCenter);
          return;
        }

        pendingCenterFrameRef.current = 0;
      };

      pendingCenterFrameRef.current = requestAnimationFrame(tryCenter);
    },
    [cancelPendingCenterFrames, scrollToDate],
  );

  const applyInstantDateStripPosition = useCallback(
    (date: Date) => {
      const container = scrollRef.current;

      if (!container || !isSameMonth(date, monthStart)) {
        return;
      }

      const cachedScrollLeft = readCachedDateStripScrollLeft(monthStart, date);

      if (cachedScrollLeft !== undefined) {
        container.scrollLeft = cachedScrollLeft;
      }

      centerDateWhenReady(date, { instant: true });
    },
    [centerDateWhenReady, monthStart],
  );

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    function updateChipWidth() {
      if (!scrollRef.current) {
        return;
      }

      const nextWidth = measureDateStripChipWidth(scrollRef.current);
      setChipWidth(nextWidth);
    }

    updateChipWidth();

    const observer = new ResizeObserver(updateChipWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    applyInstantDateStripPosition(selectedDateRef.current);
  }, [applyInstantDateStripPosition, chipWidth, monthDates, monthStart]);

  useLayoutEffect(() => {
    if (!isSameMonth(selectedDate, monthStart)) {
      return;
    }

    const selectedDateKey = toDateKey(selectedDate);
    const monthStartTime = monthStart.getTime();
    const monthChanged = monthStartTime !== previousMonthStartTimeRef.current;
    const dateChanged = selectedDateKey !== previousSelectedDateKeyRef.current;

    previousMonthStartTimeRef.current = monthStartTime;
    previousSelectedDateKeyRef.current = selectedDateKey;

    if (isInitialLayoutRef.current) {
      isInitialLayoutRef.current = false;
      return;
    }

    if (!dateChanged || monthChanged) {
      return;
    }

    centerDateWhenReady(selectedDate);
  }, [centerDateWhenReady, monthStart, selectedDate]);

  useEffect(() => {
    return () => {
      const container = scrollRef.current;
      const date = selectedDateRef.current;

      if (container && isSameMonth(date, monthStart)) {
        writeCachedDateStripScrollLeft(monthStart, date, container.scrollLeft);
      }

      cancelScrollAnimation();
      cancelPendingCenterFrames();
    };
  }, [cancelPendingCenterFrames, cancelScrollAnimation, monthStart]);

  return (
    <div
      ref={scrollRef}
      className={`-mx-4 flex gap-1 px-4 ${DATE_CHIP_SCROLL_CLASS}`}
      style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "auto" }}
    >
      {monthDates.map((date) => {
        const dateKey = toDateKey(date);
        const isHighlighted = isDateHighlighted
          ? isDateHighlighted(date)
          : isSameDay(date, selectedDate);
        const isToday = isSameDay(date, todayDate);
        const dateItems = itemsByDate?.get(dateKey) ?? [];
        const marker = getDateMarker
          ? getDateMarker(dateKey, isHighlighted)
          : dateItems.length > 0
            ? {
                dotClassName: getPlannerCalendarDateStripDotClass(dateItems, isHighlighted),
                extraCount: getPlannerCalendarDateStripExtraCount(dateItems),
                itemCountLabel: `, ${dateItems.length} scheduled item${dateItems.length === 1 ? "" : "s"}`,
              }
            : null;
        const hasMarker = marker !== null;
        const itemCountLabel = marker?.itemCountLabel ?? "";

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
            aria-pressed={isHighlighted}
            aria-label={`${formatPlannerAgendaDateLabel(date)}${itemCountLabel}`}
            onClick={() => {
              onSelectDate(date);
              centerDateWhenReady(date);
            }}
            style={chipWidth ? { width: chipWidth, minWidth: chipWidth } : undefined}
            className={`flex shrink-0 flex-col items-center rounded-xl border px-1 py-2 transition ${
              chipWidth ? "" : "w-[calc((100%-1.5rem)/7)] min-w-[calc((100%-1.5rem)/7)]"
            } ${getDateStripChipClassName(isHighlighted, isToday)}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {getWeekdayLabel(date)}
            </span>
            <span className="mt-1 text-sm font-semibold tabular-nums">{date.getDate()}</span>
            <span
              aria-hidden="true"
              className="mt-1 flex h-3 min-h-3 items-center justify-center gap-px"
            >
              {hasMarker && marker ? (
                <>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${marker.dotClassName}`}
                  />
                  {marker.extraCount > 0 ? (
                    <span
                      className={`text-[8px] font-medium leading-none ${
                        isHighlighted ? "text-ftc-bg/65" : "text-ftc-text-muted"
                      }`}
                    >
                      +{marker.extraCount}
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
