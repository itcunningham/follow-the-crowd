"use client";

import { useEffect, useRef, useState } from "react";
import { addMonths, formatCalendarMonthLabel } from "@/lib/calendar";
import CalendarMonthYearPicker from "@/app/components/CalendarMonthYearPicker";

type CalendarMonthNavProps = {
  monthStart: Date;
  onMonthStartChange: (date: Date) => void;
  onBeforeNavigate?: () => void;
};

export default function CalendarMonthNav({
  monthStart,
  onMonthStartChange,
  onBeforeNavigate,
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
    onMonthStartChange(new Date(year, month, 1));
    setMonthYearPickerOpen(false);
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => navigateMonth(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-950/60 text-zinc-400 transition hover:border-blue-500/35 hover:text-blue-300"
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
          className="min-w-[9.5rem] rounded-lg px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:text-blue-200 sm:min-w-[11rem]"
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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-950/60 text-zinc-400 transition hover:border-blue-500/35 hover:text-blue-300"
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
