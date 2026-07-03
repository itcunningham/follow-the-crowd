"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  buildPlannerCreateEventHref,
  formatPlannerSelectedDateLabel,
  getCalendarStatusBadgeClass,
  getCalendarStatusGlowClass,
  getPlannerCalendarBadgeLabel,
  getPlannerViewDaySubtitle,
  toDateKey,
  type CalendarItem,
} from "@/lib/calendar";

type PlannerCalendarDateActionsProps = {
  date: Date | null;
  items: CalendarItem[];
  onClose: () => void;
};

type ActionView = "actions" | "details";

export default function PlannerCalendarDateActions({
  date,
  items,
  onClose,
}: PlannerCalendarDateActionsProps) {
  const router = useRouter();
  const [view, setView] = useState<ActionView>("actions");

  useEffect(() => {
    if (!date) {
      return;
    }

    setView("actions");
  }, [date]);

  useEffect(() => {
    if (!date) {
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
  }, [date, onClose]);

  if (!date) {
    return null;
  }

  const dateLabel = formatPlannerSelectedDateLabel(date);
  const dateKey = toDateKey(date);

  const actionButtonClass =
    "w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 text-left transition hover:border-blue-500/35 hover:bg-blue-600/10";

  function navigateToCreateEvent() {
    onClose();
    router.push(buildPlannerCreateEventHref(dateKey));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-date-actions-title"
        className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="planner-date-actions-title" className="text-base font-semibold text-zinc-50">
              {dateLabel}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg border border-zinc-800/80 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            Close
          </button>
        </div>

        {view === "actions" ? (
          <div className="mt-4 space-y-2">
            <button type="button" onClick={navigateToCreateEvent} className={actionButtonClass}>
              <span className="block text-sm font-semibold text-zinc-100">Create event</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Set up an event for {dateLabel}
              </span>
            </button>

            <button type="button" onClick={() => setView("details")} className={actionButtonClass}>
              <span className="block text-sm font-semibold text-zinc-100">View day</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {getPlannerViewDaySubtitle(items.length)}
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setView("actions")}
              className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
            >
              ← Back
            </button>

            {items.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
                Nothing scheduled on this date.
              </p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`block rounded-xl border px-3 py-2.5 transition hover:brightness-110 ${getCalendarStatusBadgeClass(item.statusKind)} ${getCalendarStatusGlowClass(item.statusKind)}`}
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-wide">
                        {getPlannerCalendarBadgeLabel(item)}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium">{item.title}</span>
                      {item.type === "event" ? (
                        <span className="mt-0.5 block text-xs opacity-80">{item.statusLabel}</span>
                      ) : null}
                      {item.timeLabel ? (
                        <span className="mt-0.5 block text-xs opacity-70">{item.timeLabel}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
