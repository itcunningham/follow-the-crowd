"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import CalendarMonthNav from "@/app/components/CalendarMonthNav";
import {
  getCalendarWeekRows,
  getMonthStart,
  isSameDay,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

type CalendarMobileDayPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  monthStart: Date;
  onMonthStartChange: (date: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export default function CalendarMobileDayPickerSheet({
  open,
  onClose,
  monthStart,
  onMonthStartChange,
  selectedDate,
  onSelectDate,
}: CalendarMobileDayPickerSheetProps) {
  const pickerId = useId();
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const calendarWeeks = getCalendarWeekRows(monthStart);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  function handleSelectDay(day: Date) {
    onMonthStartChange(getMonthStart(day));
    onSelectDate(day);
    onClose();
  }

  const picker = open ? (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 md:hidden">
      <button
        type="button"
        aria-label="Close month picker"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${pickerId}-title`}
        className="relative max-h-[90dvh] w-full overflow-hidden overflow-y-auto rounded-t-3xl border border-ftc-border bg-ftc-bg-elevated pb-[env(safe-area-inset-bottom)] shadow-ftc-lg"
      >
        <div className="flex items-center justify-between border-b border-ftc-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-ftc-text-secondary transition hover:text-ftc-text"
          >
            Cancel
          </button>
          <h2 id={`${pickerId}-title`} className="text-sm font-semibold text-ftc-text">
            Jump to date
          </h2>
          <span className="w-[3.75rem]" aria-hidden="true" />
        </div>

        <div className="px-4 py-4">
          <CalendarMonthNav monthStart={monthStart} onMonthStartChange={onMonthStartChange} />

          <div className="mt-4 rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40">
            <div className="grid grid-cols-7 border-b border-ftc-border bg-ftc-bg-elevated/60">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 p-2">
              {calendarWeeks.flatMap((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${weekIndex}-${dayIndex}`}
                        aria-hidden="true"
                        className="h-9"
                      />
                    );
                  }

                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={toDateKey(day)}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      aria-label={day.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      aria-pressed={isSelected}
                      className={`flex h-9 items-center justify-center rounded-lg border text-sm transition ${
                        isSelected
                          ? "border-0 bg-ftc-primary text-ftc-bg"
                          : isToday
                            ? "border border-ftc-border-strong bg-ftc-surface/80 text-ftc-text hover:border-ftc-border-strong hover:bg-ftc-bg-elevated"
                            : "border-transparent text-ftc-text-secondary hover:border-ftc-border-strong hover:bg-ftc-surface/70"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (!mounted || !picker) {
    return null;
  }

  return createPortal(picker, document.body);
}
