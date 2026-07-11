"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PlannerCalendarActionButtons from "@/app/components/PlannerCalendarActionButtons";
import { isDateKeyBeforeToday } from "@/lib/bookingDateTime";
import {
  buildPlannerCreateEventFromPlansHref,
  buildPlannerCreateEventHref,
  buildCalendarOriginState,
  formatPlannerSelectedDateLabel,
  getPlannerCalendarStatusBadgeClass,
  getPlannerCalendarBadgeLabel,
  getPlannerViewDaySubtitle,
  resolveCalendarOriginEventHref,
  toDateKey,
  type CalendarItem,
} from "@/lib/calendar";

type PlannerCalendarDateActionsProps = {
  date: Date | null;
  items: CalendarItem[];
  hasSavedEventPlans: boolean;
  monthStart: Date;
  onClose: () => void;
};

type ActionView = "actions" | "details";

export default function PlannerCalendarDateActions({
  date,
  items,
  hasSavedEventPlans,
  monthStart,
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
  const calendarOrigin = buildCalendarOriginState({
    calendarDate: dateKey,
    calendarView: "event",
    monthStart,
  });
  const canCreateEventOnDate = !isDateKeyBeforeToday(dateKey);
  const isPastEmptyDate = !canCreateEventOnDate && items.length === 0;

  const actionButtonClass =
    "w-full rounded-xl border border-ftc-border bg-ftc-bg-elevated/50 px-3 py-2.5 text-left transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated";

  function navigateToCreateEvent() {
    onClose();
    router.push(buildPlannerCreateEventHref(dateKey));
  }

  function navigateToSavedEventPlans() {
    onClose();
    router.push(buildPlannerCreateEventFromPlansHref(dateKey));
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
        className="w-full max-w-md rounded-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 shadow-ftc-card sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="planner-date-actions-title" className="min-w-0 flex-1 text-base font-semibold text-ftc-text">
            {dateLabel}
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-ftc-border px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary"
          >
            Close
          </button>
        </div>

        {canCreateEventOnDate ? (
          <PlannerCalendarActionButtons
            dateKey={dateKey}
            hasSavedEventPlans={hasSavedEventPlans}
            className="mt-3"
            onCreateClick={navigateToCreateEvent}
            onPlansClick={navigateToSavedEventPlans}
          />
        ) : null}

        {view === "actions" ? (
          isPastEmptyDate ? null : (
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => setView("details")} className={actionButtonClass}>
                <span className="block text-sm font-semibold text-ftc-text">View day</span>
                <span className="mt-0.5 block text-xs text-ftc-text-muted">
                  {getPlannerViewDaySubtitle(items.length)}
                </span>
              </button>
            </div>
          )
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setView("actions")}
              className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
            >
              ← Back
            </button>

            {items.length === 0 ? (
              isPastEmptyDate ? null : (
                <p className="mt-4 rounded-xl border border-dashed border-ftc-border bg-ftc-surface/40 px-4 py-6 text-center text-sm text-ftc-text-muted">
                  Nothing scheduled on this date.
                </p>
              )
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={resolveCalendarOriginEventHref(item.href, calendarOrigin)}
                      onClick={onClose}
                      className={`block rounded-xl border-0 px-3 py-2.5 transition hover:opacity-90 ${getPlannerCalendarStatusBadgeClass(item.statusKind)}`}
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
