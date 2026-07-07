"use client";

import { useEffect, useRef, useState } from "react";
import { addMonths, formatCalendarMonthLabel } from "@/lib/calendar";
import CalendarMonthYearPicker from "@/app/components/CalendarMonthYearPicker";

type CalendarMonthNavProps = {
  monthStart: Date;
  onMonthStartChange: (date: Date) => void;
  onBeforeNavigate?: () => void;
  disablePreviousMonth?: boolean;
  minDate?: string;
};

export default function CalendarMonthNav({
  monthStart,
  onMonthStartChange,
  onBeforeNavigate,
  disablePreviousMonth = false,
  minDate,
}: CalendarMonthNavProps) {
  const monthLabelRef = useRef<HTMLButtonElement>(null);
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

      if (monthLabelRef.current?.contains(target) || monthYearPickerRef.current?.contains(target)) {
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

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => navigateMonth(-1)}
        disabled={disablePreviousMonth}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ftc-border disabled:hover:text-ftc-text-secondary"
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

      <div className="relative">
        <button
          ref={monthLabelRef}
          type="button"
          aria-label={`Select month and year, currently ${formatCalendarMonthLabel(monthStart)}`}
          aria-expanded={monthYearPickerOpen}
          aria-haspopup="dialog"
          onClick={() => setMonthYearPickerOpen((open) => !open)}
          className="min-w-[9.5rem] rounded-lg px-3 py-2 text-sm font-semibold text-ftc-text transition hover:text-ftc-primary/90 sm:min-w-[11rem]"
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
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Next month"
        onClick={() => navigateMonth(1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
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
  );
}
