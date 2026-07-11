"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarMonthNav from "@/app/components/CalendarMonthNav";
import PlannerCalendarDateActions from "@/app/components/PlannerCalendarDateActions";
import PlannerCalendarMobileDateStrip from "@/app/components/PlannerCalendarMobileDateStrip";
import {
  buildPlannerCreateEventHref,
  filterCalendarItemsForMonth,
  formatPlannerAgendaDateLabel,
  getCalendarLoadErrorMessage,
  getPlannerCalendarLegendDotClass,
  getPlannerCalendarStatusBadgeClass,
  getCalendarWeekRows,
  getDefaultSelectedCalendarDate,
  getPlannerCalendarBadgeLabel,
  groupCalendarItemsByDate,
  isSameMonth,
  loadPlannerCalendarItems,
  PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarItem,
} from "@/lib/calendar";

function PlannerCalendarMobileLegend() {
  return (
    <div
      role="list"
      aria-label="Calendar legend"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:hidden"
    >
      {PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS.map((item) => (
        <span
          key={item.mobileLabel}
          role="listitem"
          className="inline-flex items-center gap-1.5 text-xs text-ftc-text-secondary"
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${getPlannerCalendarLegendDotClass(item.kind)}`}
          />
          {item.mobileLabel}
        </span>
      ))}
    </div>
  );
}

function PlannerCalendarDesktopLegend() {
  return (
    <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
      {PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS.map((item) => (
        <span
          key={item.label}
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPlannerCalendarStatusBadgeClass(item.kind)}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PlannerCalendarLegend() {
  return (
    <>
      <PlannerCalendarMobileLegend />
      <PlannerCalendarDesktopLegend />
    </>
  );
}

function PlannerCalendarItemBadge({ item }: { item: CalendarItem }) {
  return (
    <Link
      href={item.href}
      className={`block w-full rounded-md border-0 px-1.5 py-1 text-left transition hover:opacity-90 md:px-2 md:py-1.5 ${getPlannerCalendarStatusBadgeClass(item.statusKind)}`}
    >
      <span className="block truncate text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] md:text-xs">
        {getPlannerCalendarBadgeLabel(item)}
      </span>
      <span className="block truncate text-[9px] normal-case tracking-normal opacity-90 sm:text-[10px] md:text-xs">
        {item.title}
      </span>
      {item.type === "event" ? (
        <span className="block truncate text-[9px] normal-case tracking-normal opacity-70 sm:text-[10px] md:text-xs">
          {item.statusLabel}
        </span>
      ) : null}
      {item.timeLabel ? (
        <span className="block truncate text-[9px] normal-case tracking-normal opacity-70 sm:text-[10px] md:text-xs">
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
      className="relative min-h-[6.5rem] cursor-pointer rounded-lg border border-ftc-border/70 bg-ftc-bg-elevated/20 p-1.5 transition hover:border-ftc-border-strong/90 md:min-h-[9.5rem] md:p-3 lg:min-h-[10.5rem]"
    >
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold md:h-7 md:min-w-7 md:text-sm ${
          isToday ? "bg-ftc-primary text-ftc-bg" : "text-ftc-text"
        }`}
      >
        {date.getDate()}
      </span>

      <div
        className="mt-1 space-y-1 md:space-y-1.5"
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

function PlannerCalendarAgendaCard({ item }: { item: CalendarItem }) {
  return (
    <Link
      href={item.href}
      className="block rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3 transition hover:border-ftc-border-strong"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 h-10 w-1 shrink-0 rounded-full ${getPlannerCalendarStatusBadgeClass(item.statusKind)}`}
        />
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPlannerCalendarStatusBadgeClass(item.statusKind)}`}
          >
            {getPlannerCalendarBadgeLabel(item)}
          </span>
          <p className="mt-2 truncate text-sm font-semibold text-ftc-text">{item.title}</p>
          {item.timeLabel ? (
            <p className="mt-1 text-sm text-ftc-text-secondary">{item.timeLabel}</p>
          ) : null}
          {item.type === "event" ? (
            <p className="mt-1 text-xs text-ftc-text-muted">{item.statusLabel}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PlannerCalendarMobileAgenda({
  monthStart,
  selectedDate,
  onSelectDate,
  itemsByDate,
  isTodayDate,
  isDateInViewingMonth,
}: {
  monthStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  itemsByDate: Map<string, CalendarItem[]>;
  isTodayDate: (date: Date) => boolean;
  isDateInViewingMonth: (date: Date) => boolean;
}) {
  const selectedDateItems = itemsByDate.get(toDateKey(selectedDate)) ?? [];

  return (
    <div className="mt-4 md:hidden">
      <PlannerCalendarMobileDateStrip
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        monthStart={monthStart}
        itemsByDate={itemsByDate}
      />

      <div className="mt-4">
        <h2 className="text-base font-semibold text-ftc-text">
          {formatPlannerAgendaDateLabel(selectedDate)}
        </h2>
        {isTodayDate(selectedDate) ? (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
            Today
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {selectedDateItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-4 py-8 text-center">
            <p className="text-sm text-ftc-text-muted">No events scheduled.</p>
            <Link
              href={buildPlannerCreateEventHref(toDateKey(selectedDate))}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
            >
              + Create Event
            </Link>
          </div>
        ) : (
          selectedDateItems.map((item) => <PlannerCalendarAgendaCard key={item.id} item={item} />)
        )}
      </div>

      {!isDateInViewingMonth(selectedDate) ? (
        <p className="mt-3 text-center text-xs text-ftc-text-muted">
          Viewing {formatPlannerAgendaDateLabel(selectedDate)} outside {monthStart.toLocaleDateString(undefined, { month: "long" })}
        </p>
      ) : null}
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

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

  const itemsByDate = useMemo(() => groupCalendarItemsByDate(items), [items]);
  const monthItemsByDate = useMemo(() => groupCalendarItemsByDate(monthItems), [monthItems]);

  const calendarWeeks = useMemo(() => getCalendarWeekRows(monthStart), [monthStart]);

  const viewingCurrentMonth =
    todayParts !== null &&
    monthStart.getFullYear() === todayParts.year &&
    monthStart.getMonth() === todayParts.month;

  function isTodayDate(date: Date): boolean {
    if (!todayParts) {
      return false;
    }

    return (
      date.getFullYear() === todayParts.year &&
      date.getMonth() === todayParts.month &&
      date.getDate() === todayParts.day
    );
  }

  function isDateInViewingMonth(date: Date): boolean {
    return isSameMonth(date, monthStart);
  }

  function handleMonthStartChange(nextMonthStart: Date) {
    setMonthStart(nextMonthStart);
    setSelectedDate((current) => {
      if (isSameMonth(current, nextMonthStart)) {
        return current;
      }

      return getDefaultSelectedCalendarDate(nextMonthStart, todayParts);
    });
  }

  return (
    <section className="ftc-card p-4 sm:p-5 md:p-6">
      <div className="hidden md:block">
        <h1 className="text-base font-semibold text-ftc-text">Calendar</h1>
        <p className="mt-1 text-sm text-ftc-text-muted">{description}</p>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-[var(--ftc-color-danger)] md:mt-4"
        >
          {error}
        </p>
      ) : null}

      <div className="relative mt-0 md:mt-4">
        <CalendarMonthNav monthStart={monthStart} onMonthStartChange={handleMonthStartChange} />
      </div>

      <div className="mt-1 md:mt-3">
        <PlannerCalendarLegend />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ftc-text-muted">Loading calendar...</p>
      ) : (
        <>
          <PlannerCalendarMobileAgenda
            monthStart={monthStart}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            itemsByDate={itemsByDate}
            isTodayDate={isTodayDate}
            isDateInViewingMonth={isDateInViewingMonth}
          />

          <div className="mt-4 hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 md:block">
            <div className="grid grid-cols-7 border-b border-ftc-border bg-ftc-bg-elevated/60">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted md:px-3 md:text-xs"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 p-2.5 md:gap-3 md:p-3">
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
                      items={monthItemsByDate.get(dateKey) ?? []}
                      onSelectDate={setActionDate}
                    />
                  );
                }),
              )}
            </div>
          </div>

          {monthItems.length === 0 ? (
            <p className="mt-4 hidden text-center text-sm text-ftc-text-muted md:block">
              No bookings or events this month yet
            </p>
          ) : null}
        </>
      )}

      <PlannerCalendarDateActions
        date={actionDate}
        items={actionDate ? monthItemsByDate.get(toDateKey(actionDate)) ?? [] : []}
        onClose={() => setActionDate(null)}
      />
    </section>
  );
}
