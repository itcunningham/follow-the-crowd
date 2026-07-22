"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import CalendarDotLegend from "@/app/components/calendar/CalendarDotLegend";
import CalendarMobileChrome, {
  CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS,
} from "@/app/components/calendar/CalendarMobileChrome";
import {
  CALENDAR_MOBILE_AGENDA_CARD_LEADING_CLASS,
  CALENDAR_MOBILE_AGENDA_CARD_LIST_CLASS,
  CALENDAR_MOBILE_INTERACTIVE_PRESS_CLASS,
  CalendarMobileAgendaCard,
  CalendarMobileDashedEmptyState,
  CalendarMobileSelectedDayHeader,
  useCalendarMobileAgendaTransition,
} from "@/app/components/calendar/calendarMobileUi";
import PlannerCalendarActionButtons from "@/app/components/PlannerCalendarActionButtons";
import PlannerCalendarDateActions from "@/app/components/PlannerCalendarDateActions";
import PlannerCalendarMobileDateStrip from "@/app/components/PlannerCalendarMobileDateStrip";
import { PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS } from "@/app/components/planner/PlannerWorkspaceLayout";
import {
  PlannerCalendarBodySkeleton,
  PlannerCalendarContentSkeleton,
} from "@/app/components/skeleton/Skeleton";
import type { CalendarDualModeProps } from "@/lib/calendarDualView";
import { isDateKeyBeforeToday } from "@/lib/bookingDateTime";
import { consumeEventCreateInviteMessage } from "@/lib/events/eventCreateInviteMessages";
import {
  prepareCalendarAgendaEventNavigation,
  prepareMobileDocumentScrollReset,
} from "@/lib/navigation/prepareMobileDocumentScrollReset";
import { listBookingPlans } from "@/lib/bookingPlans";
import { readBookingPlansListCache } from "@/lib/bookingPlans/bookingPlansListCache";
import {
  readPlannerCalendarItemsCache,
  writePlannerCalendarItemsCache,
} from "@/lib/plannerCalendarItemsCache";
import {
  buildCalendarOriginState,
  filterCalendarItemsForMonth,
  formatPlannerAgendaDateLabel,
  formatWrittenCalendarDateLabel,
  getCalendarLoadErrorMessage,
  getPlannerCalendarLegendDotClass,
  getPlannerCalendarStatusBadgeClass,
  getCalendarWeekRows,
  getDefaultSelectedCalendarDate,
  getMonthStart,
  formatPlannerCalendarItemHeadline,
  getPlannerCalendarBadgeLabel,
  getPlannerCalendarAgendaAccentClass,
  groupCalendarItemsByDate,
  buildPlannerCalendarMonthActivityByKey,
  getPlannerCalendarMonthActivityDotClass,
  getPlannerCalendarDateStripMarker,
  isSameDay,
  isSameMonth,
  loadPlannerCalendarItems,
  resolveCalendarOriginEventHref,
  parsePlannerCalendarDateParam,
  resolvePlannerCalendarViewState,
  sortPlannerCalendarAgendaItems,
  PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarItem,
  type CalendarOriginState,
} from "@/lib/calendar";

export function PlannerCalendarMobileLegend() {
  const bookingStatusRow = PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS.map((item) => ({
    label: item.mobileLabel,
    dotClassName: getPlannerCalendarLegendDotClass(item.kind),
  }));

  return (
    <CalendarDotLegend
      className="md:hidden"
      rows={[[], bookingStatusRow]}
    />
  );
}

export function PlannerCalendarDesktopLegend() {
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

export function PlannerCalendarLegend() {
  return (
    <>
      <PlannerCalendarMobileLegend />
      <PlannerCalendarDesktopLegend />
    </>
  );
}

function PlannerCalendarItemBadge({
  item,
  calendarOrigin,
}: {
  item: CalendarItem;
  calendarOrigin: CalendarOriginState;
}) {
  return (
    <Link
      href={resolveCalendarOriginEventHref(item.href, calendarOrigin)}
      onClick={prepareMobileDocumentScrollReset}
      className={`flex w-full items-stretch gap-1 rounded-md border-0 px-1.5 py-1 text-left transition hover:opacity-90 md:gap-1.5 md:px-2 md:py-1.5 ${getPlannerCalendarStatusBadgeClass(item.statusKind)}`}
    >
      <span
        aria-hidden="true"
        className={`my-0.5 w-0.5 shrink-0 rounded-full ${getPlannerCalendarAgendaAccentClass(item.eventFallbackColour)}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] md:text-xs">
          {getPlannerCalendarBadgeLabel(item)}
        </span>
        <span className="block truncate text-[9px] normal-case tracking-normal opacity-90 sm:text-[10px] md:text-xs">
          {formatPlannerCalendarItemHeadline(item.title, item.venue)}
        </span>
        {item.timeLabel ? (
          <span className="block truncate text-[9px] normal-case tracking-normal opacity-70 sm:text-[10px] md:text-xs">
            {item.timeLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function PlannerCalendarDayCell({
  date,
  isToday,
  isSelected,
  items,
  onSelectDate,
  monthStart,
}: {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  items: CalendarItem[];
  onSelectDate: (date: Date) => void;
  monthStart: Date;
}) {
  const dateKey = toDateKey(date);
  const calendarOrigin = buildCalendarOriginState({
    calendarDate: dateKey,
    calendarView: "event",
    monthStart,
  });

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
      aria-label={`Plan ${formatWrittenCalendarDateLabel(date, { includeYear: true })}`}
      onClick={() => onSelectDate(date)}
      onKeyDown={handleCellKeyDown}
      className={`relative min-h-[6.5rem] cursor-pointer rounded-lg border p-1.5 outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out md:min-h-[9.5rem] md:p-3 lg:min-h-[10.5rem] ${
        isSelected
          ? "border-ftc-primary bg-ftc-bg-elevated/40 ring-1 ring-ftc-primary/35"
          : isToday
            ? "border-ftc-primary/30 bg-ftc-bg-elevated/20 ring-0 hover:border-ftc-primary/45 focus-visible:ring-1 focus-visible:ring-ftc-border-strong"
            : "border-ftc-border/70 bg-ftc-bg-elevated/20 ring-0 hover:border-ftc-border-strong/90 focus-visible:ring-1 focus-visible:ring-ftc-border-strong"
      }`}
    >
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold md:h-7 md:min-w-7 md:text-sm ${
          isSelected
            ? "text-ftc-text"
            : isToday
              ? "text-ftc-primary"
              : "text-ftc-text"
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
          <PlannerCalendarItemBadge key={item.id} item={item} calendarOrigin={calendarOrigin} />
        ))}
      </div>
    </div>
  );
}

function PlannerCalendarAgendaCard({
  item,
  calendarOrigin,
}: {
  item: CalendarItem;
  calendarOrigin: CalendarOriginState;
}) {
  const router = useRouter();
  const eventHref = resolveCalendarOriginEventHref(item.href, calendarOrigin);

  const handleOpenEvent = useCallback(() => {
    prepareCalendarAgendaEventNavigation();
    router.push(eventHref, { scroll: false });
  }, [eventHref, router]);

  return (
    <CalendarMobileAgendaCard
      onClick={handleOpenEvent}
      shellClassName="border border-ftc-border-subtle bg-ftc-bg-elevated hover:border-ftc-border-strong"
      className={CALENDAR_MOBILE_INTERACTIVE_PRESS_CLASS}
      leading={
        <span
          aria-hidden="true"
          className={`${CALENDAR_MOBILE_AGENDA_CARD_LEADING_CLASS} ${getPlannerCalendarAgendaAccentClass(item.eventFallbackColour)}`}
        />
      }
      badge={
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPlannerCalendarStatusBadgeClass(item.statusKind)}`}
        >
          {getPlannerCalendarBadgeLabel(item)}
        </span>
      }
      heading={
        <span className="truncate text-sm font-semibold text-ftc-text">
          {formatPlannerCalendarItemHeadline(item.title, item.venue)}
        </span>
      }
      time={
        item.timeLabel ? (
          <span className="block truncate text-sm text-ftc-text-secondary">{item.timeLabel}</span>
        ) : undefined
      }
    />
  );
}

function PlannerCalendarMobileAgenda({
  monthStart,
  selectedDate,
  onSelectDate,
  itemsByDate,
  isTodayDate,
  isDateInViewingMonth,
  hasSavedEventPlans,
}: {
  monthStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  itemsByDate: Map<string, CalendarItem[]>;
  isTodayDate: (date: Date) => boolean;
  isDateInViewingMonth: (date: Date) => boolean;
  hasSavedEventPlans: boolean;
}) {
  const selectedDateKey = toDateKey(selectedDate);
  const calendarOrigin = buildCalendarOriginState({
    calendarDate: selectedDateKey,
    calendarView: "event",
    monthStart,
  });
  const { displayDateKey, transitionClassName, isAgendaTransitionInteractive } =
    useCalendarMobileAgendaTransition(selectedDateKey);
  const displayDate =
    parsePlannerCalendarDateParam(displayDateKey) ?? selectedDate;

  const displayDateItems = useMemo(
    () => sortPlannerCalendarAgendaItems(itemsByDate.get(displayDateKey) ?? []),
    [displayDateKey, itemsByDate],
  );
  const canCreateEventOnSelectedDate = !isDateKeyBeforeToday(selectedDateKey);
  const isPastEmptyDate =
    isDateKeyBeforeToday(selectedDateKey) && displayDateItems.length === 0;

  return (
    <div className="md:hidden">
      <div
        className={transitionClassName}
        inert={isAgendaTransitionInteractive ? undefined : true}
      >
        <div className="mt-4">
          <CalendarMobileSelectedDayHeader
            dateLabel={formatPlannerAgendaDateLabel(displayDate)}
            showToday={isTodayDate(displayDate)}
          />

          {canCreateEventOnSelectedDate ? (
            <PlannerCalendarActionButtons
              dateKey={displayDateKey}
              hasSavedEventPlans={hasSavedEventPlans}
              className="mt-3"
            />
          ) : null}
        </div>

        <div className={CALENDAR_MOBILE_AGENDA_CARD_LIST_CLASS}>
          {displayDateItems.length === 0 ? (
            isPastEmptyDate ? null : (
              <CalendarMobileDashedEmptyState
                message="No events scheduled"
                hint="Select another day or create a new event"
              />
            )
          ) : (
            displayDateItems.map((item) => (
              <PlannerCalendarAgendaCard key={item.id} item={item} calendarOrigin={calendarOrigin} />
            ))
          )}
        </div>
      </div>

      {!isDateInViewingMonth(selectedDate) ? (
        <p className="mt-3 text-center text-xs text-ftc-text-muted">
          Viewing {formatPlannerAgendaDateLabel(selectedDate)} outside {monthStart.toLocaleDateString(undefined, { month: "long" })}
        </p>
      ) : null}
    </div>
  );
}

const INVITE_MESSAGE_AUTO_DISMISS_MS = 5000;

export default function PlannerCalendar({
  variant = "standalone",
  isActive = true,
  sharedViewState,
  onMobileStripConfigChange,
  onMonthActivityDotClassChange,
}: CalendarDualModeProps = {}) {
  const isDual = variant === "dual";
  const searchParams = useSearchParams();
  const initialView = resolvePlannerCalendarViewState(
    searchParams.get("date"),
    searchParams.get("month"),
  );
  const [items, setItems] = useState<CalendarItem[]>(
    () => readPlannerCalendarItemsCache() ?? [],
  );
  const [localMonthStart, setLocalMonthStart] = useState(() => initialView.monthStart);
  const [loading, setLoading] = useState(() => readPlannerCalendarItemsCache() === null);
  const [error, setError] = useState<string | null>(null);
  const [todayParts, setTodayParts] = useState<{ year: number; month: number; day: number } | null>(
    null,
  );
  const [actionDate, setActionDate] = useState<Date | null>(null);
  const [hasSavedEventPlans, setHasSavedEventPlans] = useState(false);
  const [localSelectedDate, setLocalSelectedDate] = useState(() => initialView.selectedDate);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const monthStart = isDual && sharedViewState ? sharedViewState.monthStart : localMonthStart;
  const selectedDate = isDual && sharedViewState ? sharedViewState.selectedDate : localSelectedDate;
  const inviteDismissTimerRef = useRef<number | null>(null);
  const inviteMessageUrlDateRef = useRef<string | null>(null);

  const clearInviteMessage = useCallback(() => {
    if (inviteDismissTimerRef.current !== null) {
      window.clearTimeout(inviteDismissTimerRef.current);
      inviteDismissTimerRef.current = null;
    }

    inviteMessageUrlDateRef.current = null;
    setInviteMessage(null);
  }, []);

  useEffect(() => {
    const message = consumeEventCreateInviteMessage();

    if (message) {
      setInviteMessage(message);
      inviteMessageUrlDateRef.current = searchParams.get("date");
    }
  }, []);

  useEffect(() => {
    if (!inviteMessage) {
      return;
    }

    inviteDismissTimerRef.current = window.setTimeout(() => {
      inviteDismissTimerRef.current = null;
      inviteMessageUrlDateRef.current = null;
      setInviteMessage(null);
    }, INVITE_MESSAGE_AUTO_DISMISS_MS);

    return () => {
      if (inviteDismissTimerRef.current !== null) {
        window.clearTimeout(inviteDismissTimerRef.current);
        inviteDismissTimerRef.current = null;
      }
    };
  }, [inviteMessage]);

  useEffect(() => {
    if (!inviteMessage) {
      return;
    }

    const urlDate = searchParams.get("date");

    if (inviteMessageUrlDateRef.current !== urlDate) {
      clearInviteMessage();
    }
  }, [searchParams, inviteMessage, clearInviteMessage]);

  useLayoutEffect(() => {
    if (isDual) {
      return;
    }

    const nextView = resolvePlannerCalendarViewState(
      searchParams.get("date"),
      searchParams.get("month"),
    );

    setLocalSelectedDate((current) =>
      isSameDay(current, nextView.selectedDate) ? current : nextView.selectedDate,
    );
    setLocalMonthStart((current) =>
      isSameMonth(current, nextView.monthStart) ? current : nextView.monthStart,
    );
  }, [isDual, searchParams]);

  useEffect(() => {
    const cachedPlans = readBookingPlansListCache();

    if (cachedPlans !== null) {
      setHasSavedEventPlans(cachedPlans.length > 0);
      return;
    }

    void listBookingPlans()
      .then((plans) => {
        setHasSavedEventPlans(plans.length > 0);
      })
      .catch((loadError) => {
        console.error("Failed to load saved event plans for calendar:", loadError);
        setHasSavedEventPlans(false);
      });
  }, []);

  useEffect(() => {
    const now = new Date();
    setTodayParts({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    });
  }, []);

  const loadCalendar = useCallback(async () => {
    const cachedItems = readPlannerCalendarItemsCache();

    if (cachedItems !== null) {
      setItems(cachedItems);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const nextItems = await loadPlannerCalendarItems();
      setItems(nextItems);
      writePlannerCalendarItemsCache(nextItems);
    } catch (loadError) {
      console.error("Failed to load planner calendar:", loadError);

      if (cachedItems === null) {
        setItems([]);
      }

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
  const monthActivityByKey = useMemo(
    () => buildPlannerCalendarMonthActivityByKey(items),
    [items],
  );
  const getMonthActivityDotClass = useCallback(
    (month: number, year: number) =>
      getPlannerCalendarMonthActivityDotClass(monthActivityByKey, month, year),
    [monthActivityByKey],
  );

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

  const handleSelectDate = useCallback(
    (date: Date) => {
      clearInviteMessage();

      if (isDual && sharedViewState) {
        sharedViewState.onSelectDate(date);
        return;
      }

      setLocalSelectedDate(date);
    },
    [clearInviteMessage, isDual, sharedViewState],
  );

  function handleSelectActionDate(date: Date) {
    clearInviteMessage();

    if (isDual && sharedViewState) {
      sharedViewState.onSelectDate(date);
    } else {
      setLocalSelectedDate(date);
    }

    setActionDate(date);
  }

  const handleCloseActionDate = useCallback(() => {
    setActionDate(null);

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, []);

  function handleMonthStartChange(nextMonthStart: Date) {
    clearInviteMessage();

    if (isDual && sharedViewState) {
      sharedViewState.onMonthStartChange(nextMonthStart);
      return;
    }

    setLocalMonthStart(nextMonthStart);
    setLocalSelectedDate((current) => {
      if (isSameMonth(current, nextMonthStart)) {
        return current;
      }

      return getDefaultSelectedCalendarDate(nextMonthStart, todayParts);
    });
  }

  const dualMobileStripConfig = useMemo(
    () => ({
      getDateMarker: (dateKey: string, isHighlighted: boolean) =>
        getPlannerCalendarDateStripMarker(itemsByDate.get(dateKey) ?? [], isHighlighted),
      isDateHighlighted: (date: Date) => isSameDay(date, selectedDate),
      onSelectDate: handleSelectDate,
    }),
    [handleSelectDate, itemsByDate, selectedDate],
  );

  useEffect(() => {
    if (!isDual || !onMobileStripConfigChange) {
      return;
    }

    onMobileStripConfigChange(dualMobileStripConfig);
  }, [dualMobileStripConfig, isDual, onMobileStripConfigChange]);

  useEffect(() => {
    if (!isDual || !onMonthActivityDotClassChange) {
      return;
    }

    onMonthActivityDotClassChange(getMonthActivityDotClass);
  }, [getMonthActivityDotClass, isDual, onMonthActivityDotClassChange]);

  const alertsBlock = (
    <>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-[var(--ftc-color-danger)] md:mt-4"
        >
          {error}
        </p>
      ) : null}

      {inviteMessage ? (
        <p
          role="alert"
          className={`mt-4 mb-5 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm md:mt-4 md:mb-6 ${
            inviteMessage.includes("could not be sent")
              ? "text-[var(--ftc-color-danger)]"
              : "text-ftc-text-secondary"
          }`}
        >
          {inviteMessage}
        </p>
      ) : null}
    </>
  );

  const calendarBody = loading ? (
    isDual ? (
      <PlannerCalendarBodySkeleton />
    ) : (
      <PlannerCalendarContentSkeleton />
    )
  ) : (
    <div className="transition-opacity duration-200 ease-out opacity-100 motion-reduce:transition-none">
      {isDual ? null : (
        <CalendarMobileChrome
          monthNav={{
            monthStart,
            onMonthStartChange: handleMonthStartChange,
            getMonthActivityDotClass: getMonthActivityDotClass,
          }}
          reserveSecondaryRow
          legend={<PlannerCalendarLegend />}
          dateStrip={
            <PlannerCalendarMobileDateStrip
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              monthStart={monthStart}
              getDateMarker={(dateKey, isHighlighted) =>
                getPlannerCalendarDateStripMarker(itemsByDate.get(dateKey) ?? [], isHighlighted)
              }
            />
          }
          dayStripClassName={CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS}
        />
      )}

      <PlannerCalendarMobileAgenda
        monthStart={monthStart}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        itemsByDate={itemsByDate}
        isTodayDate={isTodayDate}
        isDateInViewingMonth={isDateInViewingMonth}
        hasSavedEventPlans={hasSavedEventPlans}
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
                  isSelected={actionDate !== null && isSameDay(day, actionDate)}
                  items={sortPlannerCalendarAgendaItems(monthItemsByDate.get(dateKey) ?? [])}
                  onSelectDate={handleSelectActionDate}
                  monthStart={monthStart}
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
    </div>
  );

  const dateActionsBlock = (
    <PlannerCalendarDateActions
      date={actionDate}
      items={
        actionDate
          ? sortPlannerCalendarAgendaItems(monthItemsByDate.get(toDateKey(actionDate)) ?? [])
          : []
      }
      hasSavedEventPlans={hasSavedEventPlans}
      monthStart={monthStart}
      onClose={handleCloseActionDate}
    />
  );

  if (isDual) {
    return (
      <>
        <div className="order-1 w-full shrink-0">{alertsBlock}</div>
        <div className="order-3 w-full shrink-0">
          {calendarBody}
          {dateActionsBlock}
        </div>
      </>
    );
  }

  return (
    <section className={PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS}>
      {alertsBlock}
      {calendarBody}
      {dateActionsBlock}
    </section>
  );
}
