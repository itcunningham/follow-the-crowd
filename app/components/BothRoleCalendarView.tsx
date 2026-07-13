"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import CalendarMonthNav from "@/app/components/CalendarMonthNav";
import DjAvailabilityCalendar, {
  DjAvailabilityCalendarLegend,
} from "@/app/components/DjAvailabilityCalendar";
import PlannerCalendar, { PlannerCalendarLegend } from "@/app/components/PlannerCalendar";
import PlannerCalendarMobileDateStrip from "@/app/components/PlannerCalendarMobileDateStrip";
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
  CalendarMobileStripConfig,
  CalendarSharedViewState,
} from "@/lib/calendarDualView";

const SHARED_LEGEND_MIN_HEIGHT_CLASS = "min-h-[3.25rem] md:min-h-[1.75rem]";

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
      {activeTab === "planner" ? (
        <PlannerCalendar
          variant="dual"
          isActive
          sharedViewState={sharedViewState}
          onMobileStripConfigChange={setPlannerStripConfig}
          onMonthActivityDotClassChange={handlePlannerMonthActivityDotClassChange}
        />
      ) : (
        <DjAvailabilityCalendar
          variant="dual"
          isActive
          sharedViewState={sharedViewState}
          onMobileStripConfigChange={setDjStripConfig}
          onMonthActivityDotClassChange={handleDjMonthActivityDotClassChange}
          onDualModeRegistration={handleDjDualModeRegistration}
          description="Manage your availability and received bookings."
        />
      )}

      <div className="order-2 w-full shrink-0">
        <div className="relative mt-4">
          <CalendarMonthNav
            monthStart={monthStart}
            onMonthStartChange={handleMonthStartChange}
            onBeforeNavigate={activeTab === "dj" ? handleDjMonthNavBeforeNavigate : undefined}
            getMonthActivityDotClass={resolveMonthActivityDotClass}
          />
        </div>

        <div className={`mt-3 ${SHARED_LEGEND_MIN_HEIGHT_CLASS}`}>
          {activeTab === "planner" ? <PlannerCalendarLegend /> : <DjAvailabilityCalendarLegend />}
        </div>

        <div className="mt-4 md:hidden">
          <PlannerCalendarMobileDateStrip
            selectedDate={selectedDate}
            onSelectDate={activeStripConfig.onSelectDate ?? handleSelectDate}
            monthStart={monthStart}
            itemsByDate={activeStripConfig.itemsByDate}
            getDateMarker={activeStripConfig.getDateMarker}
            isDateHighlighted={activeStripConfig.isDateHighlighted}
          />
        </div>
      </div>
    </section>
  );
}
