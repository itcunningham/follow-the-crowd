"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import DjAvailabilityCalendar, {
  DjAvailabilityCalendarLegend,
  GigCalendarSelectDatesButton,
} from "@/app/components/DjAvailabilityCalendar";
import PlannerCalendar, { PlannerCalendarLegend } from "@/app/components/PlannerCalendar";
import PlannerCalendarMobileDateStrip from "@/app/components/PlannerCalendarMobileDateStrip";
import CalendarMobileChrome, {
  CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS,
} from "@/app/components/calendar/CalendarMobileChrome";
import type { CalendarViewTab } from "@/app/components/CalendarViewTabs";
import { PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS } from "@/app/components/planner/PlannerWorkspaceLayout";
import {
  getDefaultSelectedCalendarDate,
  getMonthStart,
  isSameDay,
  isSameMonth,
  resolvePlannerCalendarViewState,
} from "@/lib/calendar";
import type {
  CalendarDualModeRegistration,
  CalendarDualModeChrome,
  CalendarMobileStripConfig,
  CalendarSharedViewState,
} from "@/lib/calendarDualView";

type BothRoleCalendarViewProps = {
  activeTab: CalendarViewTab;
};

export default function BothRoleCalendarView({ activeTab }: BothRoleCalendarViewProps) {
  const searchParams = useSearchParams();
  const initialView = resolvePlannerCalendarViewState(
    searchParams.get("date"),
    searchParams.get("month"),
  );
  const [monthStart, setMonthStart] = useState(() => initialView.monthStart);
  const [selectedDate, setSelectedDate] = useState(() => initialView.selectedDate);
  const [todayParts] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  });
  const [plannerStripConfig, setPlannerStripConfig] = useState<CalendarMobileStripConfig>({});
  const [djStripConfig, setDjStripConfig] = useState<CalendarMobileStripConfig>({});
  const plannerMonthActivityRef = useRef<(month: number, year: number) => string | null>(
    () => null,
  );
  const djMonthActivityRef = useRef<(month: number, year: number) => string | null>(() => null);
  const djMonthNavHandlersRef = useRef<CalendarDualModeRegistration>({});
  const [djMonthNavChrome, setDjMonthNavChrome] = useState<CalendarDualModeChrome | null>(null);
  const [plannerTabMounted, setPlannerTabMounted] = useState(() => activeTab === "planner");
  const [djTabMounted, setDjTabMounted] = useState(() => activeTab === "dj");

  useEffect(() => {
    if (activeTab === "planner") {
      setPlannerTabMounted(true);
    } else {
      setDjTabMounted(true);
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    const nextView = resolvePlannerCalendarViewState(
      searchParams.get("date"),
      searchParams.get("month"),
    );

    setSelectedDate((current) =>
      isSameDay(current, nextView.selectedDate) ? current : nextView.selectedDate,
    );
    setMonthStart((current) =>
      isSameMonth(current, nextView.monthStart) ? current : nextView.monthStart,
    );
  }, [searchParams]);

  const handleMonthStartChange = useCallback(
    (nextMonthStart: Date) => {
      setMonthStart(nextMonthStart);
      setSelectedDate((current) => {
        if (isSameMonth(current, nextMonthStart)) {
          return current;
        }

        return getDefaultSelectedCalendarDate(nextMonthStart, todayParts);
      });
    },
    [todayParts],
  );

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setMonthStart((current) => (isSameMonth(date, current) ? current : getMonthStart(date)));
  }, []);

  const sharedViewState = useMemo<CalendarSharedViewState>(
    () => ({
      monthStart,
      selectedDate,
      onMonthStartChange: handleMonthStartChange,
      onSelectDate: handleSelectDate,
    }),
    [handleMonthStartChange, handleSelectDate, monthStart, selectedDate],
  );

  const handlePlannerMonthActivityDotClassChange = useCallback(
    (getter: (month: number, year: number) => string | null) => {
      plannerMonthActivityRef.current = getter;
    },
    [],
  );

  const handleDjMonthActivityDotClassChange = useCallback(
    (getter: (month: number, year: number) => string | null) => {
      djMonthActivityRef.current = getter;
    },
    [],
  );

  const handleDjDualModeChromeChange = useCallback((chrome: CalendarDualModeChrome | null) => {
    setDjMonthNavChrome(chrome);
  }, []);

  const handleDjDualModeRegistration = useCallback((registration: CalendarDualModeRegistration) => {
    djMonthNavHandlersRef.current = registration;
  }, []);

  const resolveMonthActivityDotClass = useCallback(
    (month: number, year: number) => {
      const getter =
        activeTab === "planner" ? plannerMonthActivityRef.current : djMonthActivityRef.current;

      return getter(month, year);
    },
    [activeTab],
  );

  const handleDjMonthNavBeforeNavigate = useCallback(() => {
    djMonthNavHandlersRef.current.onBeforeMonthNavigate?.();
  }, []);

  const activeStripConfig = activeTab === "planner" ? plannerStripConfig : djStripConfig;

  return (
    <section className={`${PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS} flex flex-col`}>
      {plannerTabMounted ? (
        <div className={activeTab === "planner" ? undefined : "hidden"}>
          <PlannerCalendar
            variant="dual"
            isActive={activeTab === "planner"}
            sharedViewState={sharedViewState}
            onMobileStripConfigChange={setPlannerStripConfig}
            onMonthActivityDotClassChange={handlePlannerMonthActivityDotClassChange}
          />
        </div>
      ) : null}
      {djTabMounted ? (
        <div className={activeTab === "dj" ? undefined : "hidden"}>
          <DjAvailabilityCalendar
            variant="dual"
            isActive={activeTab === "dj"}
            sharedViewState={sharedViewState}
            onMobileStripConfigChange={setDjStripConfig}
            onMonthActivityDotClassChange={handleDjMonthActivityDotClassChange}
            onDualModeRegistration={handleDjDualModeRegistration}
            onDualModeChromeChange={handleDjDualModeChromeChange}
            description="Manage your availability and received bookings."
          />
        </div>
      ) : null}

      <div className="order-2 w-full shrink-0">
        <CalendarMobileChrome
          monthNav={{
            monthStart,
            onMonthStartChange: handleMonthStartChange,
            onBeforeNavigate: activeTab === "dj" ? handleDjMonthNavBeforeNavigate : undefined,
            getMonthActivityDotClass: resolveMonthActivityDotClass,
            overlay: activeTab === "dj" ? djMonthNavChrome?.overlay : undefined,
          }}
          reserveSecondaryRow
          secondaryRowAction={
            activeTab === "dj"
              ? (djMonthNavChrome?.secondaryRowAction ?? (
                  <GigCalendarSelectDatesButton disabled />
                ))
              : undefined
          }
          legend={
            activeTab === "planner" ? (
              <PlannerCalendarLegend />
            ) : (
              <DjAvailabilityCalendarLegend />
            )
          }
          dateStrip={
            <PlannerCalendarMobileDateStrip
              selectedDate={selectedDate}
              onSelectDate={activeStripConfig.onSelectDate ?? handleSelectDate}
              monthStart={monthStart}
              getDateMarker={activeStripConfig.getDateMarker}
              isDateHighlighted={activeStripConfig.isDateHighlighted}
            />
          }
          dayStripClassName={CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS}
        />
      </div>
    </section>
  );
}
