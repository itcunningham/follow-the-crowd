"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  WHEEL_HOURS,
  WHEEL_MERIDIEMS,
  WHEEL_MINUTES,
  clampWheelTimeToMin,
  isWheelHourDisabled,
  isWheelMeridiemDisabled,
  isWheelMinuteDisabled,
  resolveWheelTimeForPicker,
  type Meridiem,
  type WheelTimeValue,
} from "@/lib/bookingDateTime";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const WHEEL_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

const TIME_PICKER_OVERLAY_CLASS =
  "fixed inset-0 z-[100] flex items-end justify-center bg-[#0a0e14]/88 p-0 sm:items-center sm:p-4";

const TIME_PICKER_DIALOG_CLASS =
  "relative max-h-[90dvh] w-full max-w-sm overflow-hidden overflow-y-auto rounded-t-3xl border border-ftc-border-subtle bg-ftc-surface pb-[env(safe-area-inset-bottom)] shadow-ftc-lg sm:rounded-3xl sm:pb-0";

const TIME_PICKER_HEADER_CLASS =
  "flex items-center justify-between border-b border-ftc-border-subtle bg-ftc-surface px-4 py-3";

const TIME_PICKER_CANCEL_CLASS =
  "min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-ftc-text-secondary transition hover:bg-ftc-bg-elevated hover:text-ftc-text";

const TIME_PICKER_DONE_CLASS =
  "min-h-10 rounded-lg px-3 py-2 text-sm font-semibold text-ftc-primary transition hover:bg-[var(--ftc-color-primary-subtle)] hover:text-ftc-primary-dim";

const TIME_PICKER_WHEEL_AREA_CLASS = "relative bg-ftc-bg px-2 py-4";

const TIME_PICKER_SELECTION_BAND_CLASS =
  "pointer-events-none absolute inset-x-3 top-1/2 z-10 h-11 -translate-y-1/2 rounded-xl border border-[var(--ftc-color-primary-border)] bg-[var(--ftc-color-primary-subtle)]";

const TIME_PICKER_FADE_TOP_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-ftc-bg via-ftc-bg/80 to-transparent";

const TIME_PICKER_FADE_BOTTOM_CLASS =
  "pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-ftc-bg via-ftc-bg/80 to-transparent";

function TimePickerHeader({
  title,
  titleId,
  onCancel,
  onDone,
}: {
  title: string;
  titleId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div className={TIME_PICKER_HEADER_CLASS}>
      <button type="button" onClick={onCancel} className={TIME_PICKER_CANCEL_CLASS}>
        Cancel
      </button>
      <h2 id={titleId} className="text-sm font-semibold text-ftc-text">
        {title}
      </h2>
      <button type="button" onClick={onDone} className={TIME_PICKER_DONE_CLASS}>
        Done
      </button>
    </div>
  );
}

function TimePickerWheelArea({ children }: { children: ReactNode }) {
  return (
    <div className={TIME_PICKER_WHEEL_AREA_CLASS}>
      <div aria-hidden="true" className={TIME_PICKER_SELECTION_BAND_CLASS} />
      <div aria-hidden="true" className={TIME_PICKER_FADE_TOP_CLASS} />
      <div aria-hidden="true" className={TIME_PICKER_FADE_BOTTOM_CLASS} />
      <div className="relative z-0 flex items-stretch">{children}</div>
    </div>
  );
}

function findNearestEnabledIndex<T>(
  target: number,
  items: readonly T[],
  isItemDisabled?: (item: T) => boolean,
): number {
  if (!isItemDisabled || !isItemDisabled(items[target])) {
    return target;
  }

  for (let offset = 1; offset < items.length; offset += 1) {
    const after = target + offset;

    if (after < items.length && !isItemDisabled(items[after])) {
      return after;
    }

    const before = target - offset;

    if (before >= 0 && !isItemDisabled(items[before])) {
      return before;
    }
  }

  return target;
}

function WheelColumn<T extends string | number>({
  label,
  items,
  value,
  onChange,
  formatItem,
  isItemDisabled,
}: {
  label: string;
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  formatItem: (item: T) => string;
  isItemDisabled?: (item: T) => boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);
  const isProgrammaticScrollRef = useRef(false);
  const selectedIndex = Math.max(0, items.indexOf(value));

  const scrollToIndex = useCallback((index: number, smooth = false) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    isProgrammaticScrollRef.current = true;
    scroller.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "auto",
    });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    });
  }, []);

  useEffect(() => {
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  function handleScroll() {
    if (isProgrammaticScrollRef.current) {
      return;
    }

    window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;

      if (!scroller) {
        return;
      }

      const index = Math.round(scroller.scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const enabledIndex = findNearestEnabledIndex(clampedIndex, items, isItemDisabled);

      scrollToIndex(enabledIndex, true);

      if (items[enabledIndex] !== value) {
        onChange(items[enabledIndex]);
      }
    }, 80);
  }

  return (
    <div className="relative min-w-0 flex-1" role="group" aria-label={label}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-[220px] overflow-y-auto overscroll-y-contain scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div aria-hidden="true" style={{ height: WHEEL_PADDING }} />
        {items.map((item) => {
          const isSelected = item === value;
          const disabled = isItemDisabled?.(item) ?? false;

          return (
            <div
              key={String(item)}
              className={`flex h-11 shrink-0 snap-center items-center justify-center text-base tabular-nums transition-colors ${
                disabled
                  ? "cursor-not-allowed text-ftc-text-muted/35"
                  : isSelected
                    ? "font-semibold text-ftc-primary"
                    : "font-normal text-ftc-text-secondary"
              }`}
              style={{ scrollSnapAlign: "center" }}
            >
              {formatItem(item)}
            </div>
          );
        })}
        <div aria-hidden="true" style={{ height: WHEEL_PADDING }} />
      </div>
    </div>
  );
}

export function BookingTimeWheelPicker({
  open,
  title,
  value,
  onCancel,
  onDone,
  minWheelTime = null,
}: {
  open: boolean;
  title: string;
  value: WheelTimeValue;
  onCancel: () => void;
  onDone: (value: WheelTimeValue) => void;
  minWheelTime?: WheelTimeValue | null;
}) {
  const [draft, setDraft] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(resolveWheelTimeForPicker(value, minWheelTime));
    }
  }, [open, value, minWheelTime]);

  function updateDraft(next: WheelTimeValue) {
    setDraft(clampWheelTimeToMin(next, minWheelTime));
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className={TIME_PICKER_OVERLAY_CLASS}>
      <button
        type="button"
        aria-label="Close time picker"
        className="absolute inset-0"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-time-picker-title"
        className={TIME_PICKER_DIALOG_CLASS}
      >
        <TimePickerHeader
          title={title}
          titleId="booking-time-picker-title"
          onCancel={onCancel}
          onDone={() => onDone(clampWheelTimeToMin(draft, minWheelTime))}
        />

        <TimePickerWheelArea>
            <WheelColumn
              label="Hour"
              items={WHEEL_HOURS}
              value={draft.hour}
              onChange={(hour) => updateDraft({ ...draft, hour })}
              formatItem={(hour) => String(hour)}
              isItemDisabled={
                minWheelTime
                  ? (hour) => isWheelHourDisabled(hour, draft.meridiem, minWheelTime)
                  : undefined
              }
            />
            <WheelColumn
              label="Minute"
              items={WHEEL_MINUTES}
              value={draft.minute}
              onChange={(minute) => updateDraft({ ...draft, minute })}
              formatItem={(minute) => minute.toString().padStart(2, "0")}
              isItemDisabled={
                minWheelTime
                  ? (minute) => isWheelMinuteDisabled(minute, draft.hour, draft.meridiem, minWheelTime)
                  : undefined
              }
            />
            <WheelColumn
              label="AM or PM"
              items={WHEEL_MERIDIEMS}
              value={draft.meridiem}
              onChange={(meridiem) => updateDraft({ ...draft, meridiem })}
              formatItem={(meridiem) => meridiem}
              isItemDisabled={
                minWheelTime
                  ? (meridiem) => isWheelMeridiemDisabled(meridiem, minWheelTime)
                  : undefined
              }
            />
        </TimePickerWheelArea>
      </div>
    </div>,
    document.body,
  );
}

type DualTimeTab = "start" | "finish";

export function BookingDualTimeWheelPicker({
  open,
  startValue,
  finishValue,
  onCancel,
  onDone,
}: {
  open: boolean;
  startValue: WheelTimeValue;
  finishValue: WheelTimeValue;
  onCancel: () => void;
  onDone: (start: WheelTimeValue, finish: WheelTimeValue) => void;
}) {
  const [activeTab, setActiveTab] = useState<DualTimeTab>("start");
  const [startDraft, setStartDraft] = useState(startValue);
  const [finishDraft, setFinishDraft] = useState(finishValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab("start");
      setStartDraft(startValue);
      setFinishDraft(finishValue);
    }
  }, [open, startValue, finishValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open || !mounted) {
    return null;
  }

  const draft = activeTab === "start" ? startDraft : finishDraft;

  function setDraft(next: WheelTimeValue) {
    if (activeTab === "start") {
      setStartDraft(next);
      return;
    }

    setFinishDraft(next);
  }

  return createPortal(
    <div className={TIME_PICKER_OVERLAY_CLASS}>
      <button
        type="button"
        aria-label="Close set time picker"
        className="absolute inset-0"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dual-time-picker-title"
        className={TIME_PICKER_DIALOG_CLASS}
      >
        <TimePickerHeader
          title="Set Time"
          titleId="booking-dual-time-picker-title"
          onCancel={onCancel}
          onDone={() => onDone(startDraft, finishDraft)}
        />

        <div className="flex border-b border-ftc-border-subtle bg-ftc-surface p-1.5">
          {(
            [
              { id: "start" as const, label: "Start Time" },
              { id: "finish" as const, label: "Finish Time" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  isActive
                    ? "bg-ftc-primary text-ftc-bg"
                    : "text-ftc-text-secondary hover:bg-ftc-bg-elevated hover:text-ftc-text"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <TimePickerWheelArea>
            <WheelColumn
              label="Hour"
              items={WHEEL_HOURS}
              value={draft.hour}
              onChange={(hour) => setDraft({ ...draft, hour })}
              formatItem={(hour) => String(hour)}
            />
            <WheelColumn
              label="Minute"
              items={WHEEL_MINUTES}
              value={draft.minute}
              onChange={(minute) => setDraft({ ...draft, minute })}
              formatItem={(minute) => minute.toString().padStart(2, "0")}
            />
            <WheelColumn
              label="AM or PM"
              items={WHEEL_MERIDIEMS}
              value={draft.meridiem}
              onChange={(meridiem) => setDraft({ ...draft, meridiem })}
              formatItem={(meridiem) => meridiem}
            />
        </TimePickerWheelArea>
      </div>
    </div>,
    document.body,
  );
}
