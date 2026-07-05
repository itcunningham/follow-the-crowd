"use client";

import { useEffect, useState } from "react";

export function getMonthYearPickerYears(referenceDate = new Date()): number[] {
  const currentYear = referenceDate.getFullYear();
  return Array.from({ length: 6 }, (_, index) => currentYear - 1 + index);
}

type CalendarMonthYearPickerProps = {
  initialMonth: number;
  initialYear: number;
  onCancel: () => void;
  onConfirm: (month: number, year: number) => void;
};

export default function CalendarMonthYearPicker({
  initialMonth,
  initialYear,
  onCancel,
  onConfirm,
}: CalendarMonthYearPickerProps) {
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const years = getMonthYearPickerYears();
  const [draftMonth, setDraftMonth] = useState(initialMonth);
  const [draftYear, setDraftYear] = useState(initialYear);

  useEffect(() => {
    setDraftMonth(initialMonth);
    setDraftYear(initialYear);
  }, [initialMonth, initialYear]);

  const pickerButtonClass = (isSelected: boolean) =>
    isSelected
      ? "border border-ftc-primary/45 bg-ftc-primary/12 text-ftc-primary/80 shadow-ftc-glow"
      : "border border-ftc-border bg-ftc-surface/50 text-ftc-text-secondary hover:border-ftc-primary/25 hover:text-ftc-primary/90";

  const footerOutlineButtonClass =
    "inline-flex h-9 items-center justify-center rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-3 text-xs font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:bg-ftc-surface hover:text-ftc-text";

  function handleSelectToday() {
    const today = new Date();
    setDraftMonth(today.getMonth());
    setDraftYear(today.getFullYear());
  }

  return (
    <div className="w-[min(calc(100vw-2rem),17rem)] rounded-xl border border-ftc-border-strong bg-ftc-bg-elevated p-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
      <p className="text-xs font-semibold text-ftc-text">Select month</p>

      <div className="mt-2.5 grid grid-cols-4 gap-1">
        {monthLabels.map((label, index) => {
          const isSelected = index === draftMonth;

          return (
            <button
              key={label}
              type="button"
              aria-label={`Select ${label}`}
              aria-pressed={isSelected}
              onClick={() => setDraftMonth(index)}
              className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition ${pickerButtonClass(isSelected)}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">Year</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        {years.map((year) => {
          const isSelected = year === draftYear;

          return (
            <button
              key={year}
              type="button"
              aria-label={`Select ${year}`}
              aria-pressed={isSelected}
              onClick={() => setDraftYear(year)}
              className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition ${pickerButtonClass(isSelected)}`}
            >
              {year}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Cancel month and year selection"
          onClick={onCancel}
          className={footerOutlineButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          aria-label="Confirm month and year selection"
          onClick={() => onConfirm(draftMonth, draftYear)}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-ftc-primary-dim px-3 text-xs font-semibold text-white shadow-ftc-glow transition hover:bg-ftc-primary"
        >
          Confirm
        </button>
        <button
          type="button"
          aria-label="Select current month and year"
          onClick={handleSelectToday}
          className={`${footerOutlineButtonClass} ml-auto gap-1.5 px-2.5`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          Today
        </button>
      </div>
    </div>
  );
}
