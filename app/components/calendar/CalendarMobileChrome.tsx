"use client";

import type { ReactNode } from "react";
import CalendarMonthNav, {
  GIG_CALENDAR_SECONDARY_ROW_CLASS,
} from "@/app/components/CalendarMonthNav";

export const CALENDAR_MOBILE_CHROME_MONTH_NAV_CLASS = "relative mt-4";
export const CALENDAR_MOBILE_CHROME_LEGEND_CLASS =
  "mt-3 min-h-[3.25rem] md:min-h-[1.75rem]";
export const CALENDAR_MOBILE_CHROME_DAY_STRIP_CLASS = "mt-4 md:hidden";
export const CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS = "mt-1 md:hidden";

type CalendarMonthNavConfig = {
  monthStart: Date;
  onMonthStartChange: (date: Date) => void;
  onBeforeNavigate?: () => void;
  getMonthActivityDotClass?: (month: number, year: number) => string | null;
  overlay?: ReactNode;
};

type CalendarMobileChromeProps = {
  monthNav: CalendarMonthNavConfig;
  legend: ReactNode;
  dateStrip: ReactNode;
  monthNavPrefix?: ReactNode;
  secondaryRowAction?: ReactNode;
  dayStripClassName?: string;
};

export default function CalendarMobileChrome({
  monthNav,
  legend,
  dateStrip,
  monthNavPrefix,
  secondaryRowAction,
  dayStripClassName = CALENDAR_MOBILE_CHROME_DAY_STRIP_CLASS,
}: CalendarMobileChromeProps) {
  return (
    <>
      <div className={CALENDAR_MOBILE_CHROME_MONTH_NAV_CLASS}>
        {monthNavPrefix}
        <CalendarMonthNav {...monthNav} />
        {secondaryRowAction ? (
          <div className={GIG_CALENDAR_SECONDARY_ROW_CLASS}>{secondaryRowAction}</div>
        ) : null}
      </div>

      <div className={CALENDAR_MOBILE_CHROME_LEGEND_CLASS}>{legend}</div>

      <div className={dayStripClassName}>{dateStrip}</div>
    </>
  );
}
