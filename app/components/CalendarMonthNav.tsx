"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { addMonths, formatCalendarMonthLabel } from "@/lib/calendar";
import CalendarMonthYearPicker from "@/app/components/CalendarMonthYearPicker";

export const CALENDAR_JUMP_TO_BUTTON_CLASS =
  "shrink-0 rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-1.5 py-1.5 text-[10px] font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text sm:px-2.5 sm:text-[11px]";

type CalendarMonthNavProps = {
  monthStart: Date;
  onMonthStartChange: (date: Date) => void;
  onBeforeNavigate?: () => void;
  disablePreviousMonth?: boolean;
  minDate?: string;
  getMonthActivityDotClass?: (month: number, year: number) => string | null;
  showJumpTo?: boolean;
  trailingAction?: ReactNode;
  overlay?: ReactNode;
};

export default function CalendarMonthNav({
  monthStart,
  onMonthStartChange,
  onBeforeNavigate,
  disablePreviousMonth = false,
  minDate,
  getMonthActivityDotClass,
  showJumpTo = true,
  trailingAction,
  overlay,
}: CalendarMonthNavProps) {
  const monthLabelRef = useRef<HTMLButtonElement>(null);
  const jumpToButtonRef = useRef<HTMLButtonElement>(null);
  const monthYearPickerRef = useRef<HTMLDivElement>(null);
  const [monthYearPickerOpen, setMonthYearPickerOpen] = useState(false);

  useEffect(() => {
    if (!monthYearPickerOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMonthYearPickerOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        monthLabelRef.current?.contains(target) ||
        jumpToButtonRef.current?.contains(target) ||
        monthYearPickerRef.current?.contains(target)
      ) {
        return;
      }

      setMonthYearPickerOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [monthYearPickerOpen]);

  function navigateMonth(amount: number) {
    onBeforeNavigate?.();
    setMonthYearPickerOpen(false);
    onMonthStartChange(addMonths(monthStart, amount));
  }

  function handleConfirmMonthYear(month: number, year: number) {
    onBeforeNavigate?.();

    const selectedMonthStart = new Date(year, month, 1);

    if (minDate) {
      const [minYear, minMonth] = minDate.split("-").map(Number);
      const minMonthStart = new Date(minYear, minMonth - 1, 1);
      onMonthStartChange(selectedMonthStart < minMonthStart ? minMonthStart : selectedMonthStart);
    } else {
      onMonthStartChange(selectedMonthStart);
    }

    setMonthYearPickerOpen(false);
  }

  function openMonthYearPicker() {
    setMonthYearPickerOpen(true);
  }

  return (
    <div className="relative w-full">
      {overlay}
      <div className="relative z-10 flex min-h-9 items-center gap-0.5 sm:gap-1">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => navigateMonth(-1)}
            disabled={disablePreviousMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ftc-border disabled:hover:text-ftc-text-secondary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="relative min-w-0">
            <button
              ref={monthLabelRef}
              type="button"
              aria-label={`Select month and year, currently ${formatCalendarMonthLabel(monthStart)}`}
              aria-expanded={monthYearPickerOpen}
              aria-haspopup="dialog"
              onClick={() => setMonthYearPickerOpen((open) => !open)}
              className="min-w-[8.75rem] truncate rounded-lg px-2 py-2 text-sm font-semibold text-ftc-text transition hover:text-ftc-primary/90 sm:min-w-[11rem] sm:px-3"
            >
              {formatCalendarMonthLabel(monthStart)}
            </button>

            {monthYearPickerOpen ? (
              <div
                ref={monthYearPickerRef}
                className="absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2"
              >
                <CalendarMonthYearPicker
                  initialMonth={monthStart.getMonth()}
                  initialYear={monthStart.getFullYear()}
                  onCancel={() => setMonthYearPickerOpen(false)}
                  onConfirm={handleConfirmMonthYear}
                  getMonthActivityDotClass={getMonthActivityDotClass}
                />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Next month"
            onClick={() => navigateMonth(1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 pl-0.5 sm:pl-1">
          {trailingAction}
          {showJumpTo ? (
            <button
              ref={jumpToButtonRef}
              type="button"
              aria-label="Jump to month and year"
              aria-expanded={monthYearPickerOpen}
              aria-haspopup="dialog"
              onClick={openMonthYearPicker}
              className={CALENDAR_JUMP_TO_BUTTON_CLASS}
            >
              Jump to
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
