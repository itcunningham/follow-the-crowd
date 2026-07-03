"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  WHEEL_HOURS,
  WHEEL_MERIDIEMS,
  WHEEL_MINUTES,
  type Meridiem,
  type WheelTimeValue,
} from "@/lib/bookingDateTime";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const WHEEL_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

function WheelColumn<T extends string | number>({
  label,
  items,
  value,
  onChange,
  formatItem,
}: {
  label: string;
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  formatItem: (item: T) => string;
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

      scrollToIndex(clampedIndex, true);

      if (items[clampedIndex] !== value) {
        onChange(items[clampedIndex]);
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

          return (
            <div
              key={String(item)}
              className={`flex h-11 shrink-0 snap-center items-center justify-center text-base transition-colors ${
                isSelected ? "font-semibold text-zinc-50" : "text-zinc-500"
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
}: {
  open: boolean;
  title: string;
  value: WheelTimeValue;
  onCancel: () => void;
  onDone: (value: WheelTimeValue) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
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
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#0a0a0c] shadow-[0_0_40px_rgba(59,130,246,0.15)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            Cancel
          </button>
          <h2
            id="booking-time-picker-title"
            className="text-sm font-semibold text-zinc-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onDone(draft)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          >
            Done
          </button>
        </div>

        <div className="relative px-2 py-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-1/2 z-10 h-11 -translate-y-1/2 rounded-xl border border-blue-500/25 bg-blue-500/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-[#0a0a0c] to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-[#0a0a0c] to-transparent"
          />

          <div className="relative z-0 flex items-stretch">
            <WheelColumn
              label="Hour"
              items={WHEEL_HOURS}
              value={draft.hour}
              onChange={(hour) => setDraft((prev) => ({ ...prev, hour }))}
              formatItem={(hour) => String(hour)}
            />
            <WheelColumn
              label="Minute"
              items={WHEEL_MINUTES}
              value={draft.minute}
              onChange={(minute) => setDraft((prev) => ({ ...prev, minute }))}
              formatItem={(minute) => minute.toString().padStart(2, "0")}
            />
            <WheelColumn
              label="AM or PM"
              items={WHEEL_MERIDIEMS}
              value={draft.meridiem}
              onChange={(meridiem) => setDraft((prev) => ({ ...prev, meridiem }))}
              formatItem={(meridiem) => meridiem}
            />
          </div>
        </div>
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
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
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-zinc-800 bg-[#0a0a0c] shadow-[0_0_40px_rgba(59,130,246,0.15)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            Cancel
          </button>
          <h2
            id="booking-dual-time-picker-title"
            className="text-sm font-semibold text-zinc-100"
          >
            Set Time
          </h2>
          <button
            type="button"
            onClick={() => onDone(startDraft, finishDraft)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          >
            Done
          </button>
        </div>

        <div className="flex border-b border-zinc-800/80 p-1">
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
                    ? "bg-blue-600/15 text-blue-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative px-2 py-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-1/2 z-10 h-11 -translate-y-1/2 rounded-xl border border-blue-500/25 bg-blue-500/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-[#0a0a0c] to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-[#0a0a0c] to-transparent"
          />

          <div className="relative z-0 flex items-stretch">
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
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
