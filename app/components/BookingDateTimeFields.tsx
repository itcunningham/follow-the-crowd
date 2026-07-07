"use client";

import FtcDatePicker from "@/app/components/FtcDatePicker";
import { useEffect, useRef, useState } from "react";
import { BookingTimeWheelPicker } from "@/app/components/BookingTimeWheelPicker";
import {
  BOOKING_DATE_TIME_INPUT_CLASS,
  BOOKING_FIELD_LABEL_CLASS,
  BOOKING_TIME_BUTTON_CLASS,
  BOOKING_TIME_BUTTON_COMPACT_CLASS,
  clockPartsToWheelTime,
  combineClockAndMeridiem,
  combineSetTimeRange,
  defaultFinishWheelTime,
  defaultStartWheelTime,
  extractClockDisplay,
  formatTimeButtonLabel,
  guardEventDatePickerChange,
  isSavedEventDateBeforeMin,
  parseEventDate,
  parseSetTimeRange,
  resolveMinEventDateKey,
  resolvePickerEventDateValue,
  savedEventDateNeedsPickerReselection,
  wheelTimeToClockParts,
  type Meridiem,
  type WheelTimeValue,
} from "@/lib/bookingDateTime";

export function BookingDateField({
  label,
  value,
  onChange,
  required = false,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minDate?: string;
}) {
  const parsed = parseEventDate(value);
  const effectiveMinDate = resolveMinEventDateKey(minDate);
  const pickerValue = resolvePickerEventDateValue(value, effectiveMinDate);
  const needsPickerReselection = savedEventDateNeedsPickerReselection(value, effectiveMinDate);
  const savedDateIsPast = isSavedEventDateBeforeMin(value, effectiveMinDate);
  const savedDateLabel = parsed.legacyValue ?? parsed.isoDate;

  function handleDateChange(nextValue: string) {
    const guarded = guardEventDatePickerChange(nextValue, effectiveMinDate);

    if (guarded === null) {
      return;
    }

    onChange(guarded);
  }

  return (
    <label className="block">
      <span className={BOOKING_FIELD_LABEL_CLASS}>{label}</span>
      {needsPickerReselection && savedDateLabel ? (
        <p className="mb-2 rounded-lg border border-ftc-border bg-ftc-bg-elevated/50 px-3 py-2 text-xs text-ftc-text-secondary">
          Saved date: <span className="text-ftc-text">{savedDateLabel}</span>
          {savedDateIsPast ? (
            <span className="mt-1 block text-[var(--ftc-color-danger)]">
              Choose today or a future date from the calendar.
            </span>
          ) : (
            <span className="mt-1 block">Choose a date from the calendar.</span>
          )}
        </p>
      ) : null}
      <FtcDatePicker
        value={pickerValue}
        onChange={handleDateChange}
        required={required && needsPickerReselection}
        minDate={effectiveMinDate}
        ariaLabel={label}
      />
    </label>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-ftc-primary/90"
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v4l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={`shrink-0 text-ftc-text-muted ${compact ? "h-3 w-3" : "h-4 w-4"}`}
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

function BookingTimeControl({
  label,
  clock,
  meridiem,
  defaultWheelTime,
  onTimeChange,
  required = false,
  showLabel = true,
  variant = "default",
  buttonLabel,
}: {
  label: string;
  clock: string;
  meridiem: Meridiem;
  defaultWheelTime: () => WheelTimeValue;
  onTimeChange: (clock: string, meridiem: Meridiem) => void;
  required?: boolean;
  showLabel?: boolean;
  variant?: "default" | "compact";
  buttonLabel?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCompact = variant === "compact";
  const resolvedLabel =
    buttonLabel ??
    (isCompact
      ? combineClockAndMeridiem(clock, meridiem) || "Select"
      : formatTimeButtonLabel(clock, meridiem));
  const hasValue = resolvedLabel !== "Select" && resolvedLabel !== "Select time";

  function openPicker() {
    setPickerOpen(true);
  }

  function handleDone(value: WheelTimeValue) {
    const parts = wheelTimeToClockParts(value);
    onTimeChange(parts.clock, parts.meridiem);
    setPickerOpen(false);
  }

  const pickerValue =
    clockPartsToWheelTime(clock, meridiem) ?? defaultWheelTime();

  return (
    <div>
      {showLabel ? <span className={BOOKING_FIELD_LABEL_CLASS}>{label}</span> : null}
      <button
        type="button"
        onClick={openPicker}
        aria-label={`${label}, ${resolvedLabel}`}
        aria-required={required}
        className={isCompact ? BOOKING_TIME_BUTTON_COMPACT_CLASS : BOOKING_TIME_BUTTON_CLASS}
      >
        {isCompact ? (
          <>
            <span
              className={`min-w-0 flex-1 truncate text-center tabular-nums ${hasValue ? "text-ftc-text" : "text-ftc-text-muted"}`}
            >
              {resolvedLabel}
            </span>
            <ChevronIcon compact />
          </>
        ) : (
          <>
            <ClockIcon />
            <span
              className={`min-w-0 flex-1 tabular-nums ${hasValue ? "text-ftc-text" : "text-ftc-text-muted"}`}
            >
              {resolvedLabel}
            </span>
            <ChevronIcon />
          </>
        )}
      </button>

      <BookingTimeWheelPicker
        open={pickerOpen}
        title={label}
        value={pickerValue}
        onCancel={() => setPickerOpen(false)}
        onDone={handleDone}
      />
    </div>
  );
}

export function BookingTimeField({
  label,
  value,
  onChange,
  required = false,
  showLabel = true,
  defaultWheelTime = defaultStartWheelTime,
  variant = "default",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  showLabel?: boolean;
  defaultWheelTime?: () => WheelTimeValue;
  variant?: "default" | "compact";
}) {
  const userEditedRef = useRef(false);
  const [clock, setClock] = useState("");
  const [meridiem, setMeridiem] = useState<Meridiem>("PM");
  const [legacyValue, setLegacyValue] = useState<string | null>(null);

  useEffect(() => {
    if (userEditedRef.current) {
      return;
    }

    const parsed = parseSetTimeRange(value);

    if (parsed.unparsedRaw) {
      setLegacyValue(parsed.unparsedRaw);
      setClock("");
      setMeridiem("PM");
      return;
    }

    setLegacyValue(null);

    if (parsed.start) {
      setClock(extractClockDisplay(parsed.start.formatted));
      setMeridiem(parsed.start.meridiem);
    } else {
      setClock("");
      setMeridiem("PM");
    }
  }, [value]);

  function handleTimeChange(nextClock: string, nextMeridiem: Meridiem) {
    userEditedRef.current = true;
    setLegacyValue(null);
    setClock(nextClock);
    setMeridiem(nextMeridiem);
    onChange(combineClockAndMeridiem(nextClock, nextMeridiem));
  }

  const formattedTime = combineClockAndMeridiem(clock, meridiem);
  const compactButtonLabel = legacyValue || formattedTime || "Select";

  return (
    <div>
      {legacyValue && variant !== "compact" ? (
        <p
          className={`rounded-lg border border-ftc-border bg-ftc-bg-elevated/50 px-2.5 py-1.5 text-xs text-ftc-text-secondary ${showLabel ? "mb-2" : "mb-1.5"}`}
        >
          Saved time: <span className="text-ftc-text">{legacyValue}</span>
        </p>
      ) : null}
      <BookingTimeControl
        label={label}
        showLabel={showLabel}
        clock={clock}
        meridiem={meridiem}
        defaultWheelTime={defaultWheelTime}
        onTimeChange={handleTimeChange}
        required={required}
        variant={variant}
        buttonLabel={variant === "compact" ? compactButtonLabel : undefined}
      />
    </div>
  );
}

export function BookingSetTimeRangeField({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const userEditedRef = useRef(false);
  const [startClock, setStartClock] = useState("");
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>("PM");
  const [finishClock, setFinishClock] = useState("");
  const [finishMeridiem, setFinishMeridiem] = useState<Meridiem>("AM");

  useEffect(() => {
    if (userEditedRef.current) {
      return;
    }

    const parsed = parseSetTimeRange(value);

    if (parsed.unparsedRaw) {
      setStartClock("");
      setStartMeridiem("PM");
      setFinishClock("");
      setFinishMeridiem("AM");
      return;
    }

    if (parsed.start) {
      setStartClock(extractClockDisplay(parsed.start.formatted));
      setStartMeridiem(parsed.start.meridiem);
    } else {
      setStartClock("");
      setStartMeridiem("PM");
    }

    if (parsed.finish) {
      setFinishClock(extractClockDisplay(parsed.finish.formatted));
      setFinishMeridiem(parsed.finish.meridiem);
    } else {
      setFinishClock("");
      setFinishMeridiem("AM");
    }
  }, [value]);

  function emitChange(
    nextStartClock: string,
    nextStartMeridiem: Meridiem,
    nextFinishClock: string,
    nextFinishMeridiem: Meridiem,
  ) {
    userEditedRef.current = true;

    const startFormatted = combineClockAndMeridiem(nextStartClock, nextStartMeridiem);
    const finishFormatted = combineClockAndMeridiem(nextFinishClock, nextFinishMeridiem);

    onChange(combineSetTimeRange(startFormatted, finishFormatted));
  }

  function handleStartTimeChange(nextClock: string, nextMeridiem: Meridiem) {
    setStartClock(nextClock);
    setStartMeridiem(nextMeridiem);
    emitChange(nextClock, nextMeridiem, finishClock, finishMeridiem);
  }

  function handleFinishTimeChange(nextClock: string, nextMeridiem: Meridiem) {
    setFinishClock(nextClock);
    setFinishMeridiem(nextMeridiem);
    emitChange(startClock, startMeridiem, nextClock, nextMeridiem);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BookingTimeControl
        label="Start Time"
        clock={startClock}
        meridiem={startMeridiem}
        defaultWheelTime={defaultStartWheelTime}
        onTimeChange={handleStartTimeChange}
        required={required}
      />
      <BookingTimeControl
        label="Finish Time"
        clock={finishClock}
        meridiem={finishMeridiem}
        defaultWheelTime={defaultFinishWheelTime}
        onTimeChange={handleFinishTimeChange}
      />
    </div>
  );
}
