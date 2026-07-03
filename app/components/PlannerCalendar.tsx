"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarMonthNav from "@/app/components/CalendarMonthNav";
import PlannerCalendarDateActions from "@/app/components/PlannerCalendarDateActions";
import {
  filterCalendarItemsForMonth,
  getCalendarLoadErrorMessage,
  getCalendarStatusBadgeClass,
  getCalendarStatusGlowClass,
  getCalendarWeekRows,
  getPlannerCalendarBadgeLabel,
  groupCalendarItemsByDate,
  loadPlannerCalendarItems,
  PLANNER_CALENDAR_LEGEND_ITEMS,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarItem,
} from "@/lib/calendar";

function PlannerCalendarLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {PLANNER_CALENDAR_LEGEND_ITEMS.map((item) => (
        <span
          key={item.label}
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCalendarStatusGlowClass(item.kind)} ${getCalendarStatusBadgeClass(item.kind)}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PlannerCalendarItemBadge({ item }: { item: CalendarItem }) {
  return (
    <Link
      href={item.href}
      className={`block w-full rounded-md border px-1 py-1 text-left transition hover:brightness-110 ${getCalendarStatusBadgeClass(item.statusKind)} ${getCalendarStatusGlowClass(item.statusKind)}`}
    >
      <span className="block truncate text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]">
        {getPlannerCalendarBadgeLabel(item)}
      </span>
      <span className="block truncate text-[9px] normal-case tracking-normal opacity-90 sm:text-[10px]">
        {item.title}
      </span>
      {item.type === "event" ? (
        <span className="block truncate text-[9px] normal-case tracking-normal opacity-70 sm:text-[10px]">
          {item.statusLabel}
        </span>
      ) : null}
      {item.timeLabel ? (
        <span className="block truncate text-[9px] normal-case tracking-normal opacity-70 sm:text-[10px]">
          {item.timeLabel}
        </span>
      ) : null}
    </Link>
  );
}

function PlannerCalendarDayCell({
  date,
  isToday,
  items,
  onSelectDate,
}: {
  date: Date;
  isToday: boolean;
  items: CalendarItem[];
  onSelectDate: (date: Date) => void;
}) {
  function handleCellKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectDate(date);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Plan ${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
      onClick={() => onSelectDate(date)}
      onKeyDown={handleCellKeyDown}
      className="relative min-h-[6.5rem] cursor-pointer rounded-lg border border-zinc-800/70 bg-zinc-950/20 p-1.5 transition hover:border-zinc-700/90 sm:min-h-[7.5rem] sm:p-2"
    >
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold ${
          isToday ? "bg-blue-600/20 text-blue-300" : "text-zinc-200"
        }`}
      >
        {date.getDate()}
      </span>

      <div
        className="mt-1 space-y-1"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <PlannerCalendarItemBadge key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

type PlannerCalendarProps = {
  description?: string;
};

export default function PlannerCalendar({
  description = "Your events and booking activity by date.",
}: PlannerCalendarProps) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [monthStart, setMonthStart] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayParts, setTodayParts] = useState<{ year: number; month: number; day: number } | null>(
    null,
  );
  const [actionDate, setActionDate] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setTodayParts({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    });
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await loadPlannerCalendarItems());
    } catch (loadError) {
      console.error("Failed to load planner calendar:", loadError);
      setItems([]);
      setError(getCalendarLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const monthItems = useMemo(
    () => filterCalendarItemsForMonth(items, monthStart),
    [items, monthStart],
  );

  const itemsByDate = useMemo(() => groupCalendarItemsByDate(monthItems), [monthItems]);

  const calendarWeeks = useMemo(() => getCalendarWeekRows(monthStart), [monthStart]);

  const viewingCurrentMonth =
    todayParts !== null &&
    monthStart.getFullYear() === todayParts.year &&
    monthStart.getMonth() === todayParts.month;

  function isTodayDate(date: Date): boolean {
    if (!viewingCurrentMonth || todayParts === null) {
      return false;
    }

    return (
      date.getFullYear() === todayParts.year &&
      date.getMonth() === todayParts.month &&
      date.getDate() === todayParts.day
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
      <div>
        <h1 className="text-base font-semibold text-zinc-50">Calendar</h1>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}

      <div className="relative mt-4">
        <CalendarMonthNav monthStart={monthStart} onMonthStartChange={setMonthStart} />
      </div>

      <div className="mt-3">
        <PlannerCalendarLegend />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading calendar...</p>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40">
            <div className="grid grid-cols-7 border-b border-zinc-800/80 bg-zinc-950/60">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:px-2"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 p-2 sm:gap-2 sm:p-2.5">
              {calendarWeeks.flatMap((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${weekIndex}-${dayIndex}`}
                        aria-hidden="true"
                        className="min-h-0"
                      />
                    );
                  }

                  const dateKey = toDateKey(day);

                  return (
                    <PlannerCalendarDayCell
                      key={dateKey}
                      date={day}
                      isToday={isTodayDate(day)}
                      items={itemsByDate.get(dateKey) ?? []}
                      onSelectDate={setActionDate}
                    />
                  );
                }),
              )}
            </div>
          </div>

          {monthItems.length === 0 ? (
            <p className="mt-4 text-center text-sm text-zinc-500">
              No bookings or events this month yet.
            </p>
          ) : null}
        </>
      )}

      <PlannerCalendarDateActions
        date={actionDate}
        items={actionDate ? itemsByDate.get(toDateKey(actionDate)) ?? [] : []}
        onClose={() => setActionDate(null)}
      />
    </section>
  );
}
