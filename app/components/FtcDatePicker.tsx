"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import CalendarMonthNav from "@/app/components/CalendarMonthNav";
import {
  BOOKING_DATE_TIME_INPUT_CLASS,
  guardEventDatePickerChange,
  parseEventDate,
  resolveMinEventDateKey,
  resolvePickerEventDateValue,
  savedEventDateNeedsPickerReselection,
  isSavedEventDateBeforeMin,
} from "@/lib/bookingDateTime";
import {
  getCalendarWeekRows,
  getMonthStart,
  isSameDay,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { formatAvailabilityDateLabel } from "@/lib/djAvailability";

function getMonthStartFromMinDate(minDate: string): Date {
  const [year, month] = minDate.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function clampMonthStartToMin(monthStart: Date, minDate: string): Date {
  const minMonthStart = getMonthStartFromMinDate(minDate);
  return monthStart < minMonthStart ? minMonthStart : monthStart;
}

function getMonthStartFromValue(value: string, minDate: string): Date {
  const parsed = parseEventDate(value);

  if (parsed.isoDate) {
    const [year, month] = parsed.isoDate.split("-").map(Number);
    return clampMonthStartToMin(new Date(year, month - 1, 1), minDate);
  }

  return clampMonthStartToMin(getMonthStart(new Date()), minDate);
}

function formatPickerButtonLabel(value: string): string {
  const parsed = parseEventDate(value);

  if (parsed.isoDate) {
    return formatAvailabilityDateLabel(parsed.isoDate);
  }

  return "Select date";
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-ftc-primary/90"
    >
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-ftc-text-muted"
    >
      <path
        d="M7.5 8.5 10 11l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FtcDatePicker({
  value,
  onChange,
  required = false,
  disabled = false,
  minDate,
  ariaLabel = "Event date",
  className = BOOKING_DATE_TIME_INPUT_CLASS,
  debugSource = "app/components/FtcDatePicker.tsx",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  ariaLabel?: string;
  className?: string;
  debugSource?: string;
}) {
  const pickerId = useId();
  const effectiveMinDate = resolveMinEventDateKey(minDate);
  const pickerValue = resolvePickerEventDateValue(value, effectiveMinDate);
  const parsed = parseEventDate(pickerValue);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [monthStart, setMonthStart] = useState(() =>
    getMonthStartFromValue(pickerValue, effectiveMinDate),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMonthStart(getMonthStartFromValue(pickerValue, effectiveMinDate));
  }, [effectiveMinDate, open, pickerValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedDate = parsed.isoDate
    ? (() => {
        const [year, month, day] = parsed.isoDate.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : null;
  const today = new Date();
  const calendarWeeks = getCalendarWeekRows(monthStart);
  const buttonLabel = formatPickerButtonLabel(pickerValue);
  const hasValue = Boolean(parsed.isoDate);

  function isDayDisabled(day: Date): boolean {
    return toDateKey(day) < effectiveMinDate;
  }

  function handleSelectDay(day: Date) {
    const clickedDate = toDateKey(day);
    const blocked = isDayDisabled(day);

    console.info("[ftc:date-picker]", {
      clickedDate,
      minDate: effectiveMinDate,
      blocked,
      debugSource,
      formValue: value,
      pickerValue,
    });

    if (blocked) {
      return;
    }

    const nextValue = guardEventDatePickerChange(clickedDate, effectiveMinDate);

    if (!nextValue) {
      console.info("[ftc:date-picker]", {
        clickedDate,
        minDate: effectiveMinDate,
        blocked: true,
        reason: "guardEventDatePickerChange rejected",
        debugSource,
      });
      return;
    }

    onChange(nextValue);
    setOpen(false);
  }

  function handleDayPointerUp(day: Date, event: React.PointerEvent<HTMLButtonElement>) {
    const clickedDate = toDateKey(day);
    const blocked = isDayDisabled(day);

    console.info("[ftc:date-picker]", {
      clickedDate,
      minDate: effectiveMinDate,
      blocked,
      debugSource,
      eventType: event.type,
    });

    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleMonthStartChange(nextMonthStart: Date) {
    setMonthStart(clampMonthStartToMin(nextMonthStart, effectiveMinDate));
  }

  const minMonthStart = getMonthStartFromMinDate(effectiveMinDate);
  const canNavigateToPreviousMonth = monthStart > minMonthStart;

  function openPicker() {
    if (disabled) {
      return;
    }

    setOpen(true);
  }

  const picker = open ? (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close date picker"
        className="absolute inset-0"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${pickerId}-title`}
        className="relative max-h-[90dvh] w-full max-w-sm overflow-hidden overflow-y-auto rounded-t-3xl border border-ftc-border bg-ftc-bg-elevated pb-[env(safe-area-inset-bottom)] shadow-ftc-lg sm:rounded-3xl sm:pb-0"
      >
        <div className="flex items-center justify-between border-b border-ftc-border px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1 text-sm font-medium text-ftc-text-secondary transition hover:text-ftc-text"
          >
            Cancel
          </button>
          <h2 id={`${pickerId}-title`} className="text-sm font-semibold text-ftc-text">
            Select date
          </h2>
          <span className="w-[3.75rem]" aria-hidden="true" />
        </div>

        <div className="px-4 py-4">
          <CalendarMonthNav
            monthStart={monthStart}
            onMonthStartChange={handleMonthStartChange}
            disablePreviousMonth={!canNavigateToPreviousMonth}
            minDate={effectiveMinDate}
          />

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

                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isToday = isSameDay(day, today);
                  const isDisabledDay = isDayDisabled(day);

                  return (
                    <button
                      key={toDateKey(day)}
                      type="button"
                      onPointerUp={(event) => handleDayPointerUp(day, event)}
                      onClick={(event) => {
                        if (isDayDisabled(day)) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }

                        handleSelectDay(day);
                      }}
                      tabIndex={isDisabledDay ? -1 : 0}
                      aria-label={day.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      aria-pressed={isSelected}
                      aria-disabled={isDisabledDay}
                      className={`flex h-9 items-center justify-center rounded-lg border text-sm transition ${
                        isDisabledDay
                          ? "pointer-events-none cursor-not-allowed border-transparent text-ftc-text-muted/40"
                          : isSelected
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

  return (
    <>
      <input
        type="text"
        value={parsed.isoDate}
        readOnly
        required={required && !parsed.legacyValue}
        min={effectiveMinDate}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={`${ariaLabel}, ${buttonLabel}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${className} flex items-center gap-2.5 text-left disabled:cursor-not-allowed`}
      >
        <CalendarIcon />
        <span className={`min-w-0 flex-1 ${hasValue ? "text-ftc-text" : "text-ftc-text-muted"}`}>
          {buttonLabel}
        </span>
        <ChevronIcon />
      </button>
      {mounted && picker ? createPortal(picker, document.body) : null}
    </>
  );
}
