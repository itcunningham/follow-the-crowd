"use client";

import Link from "next/link";
import {
  buildPlannerCreateEventFromPlansHref,
  buildPlannerCreateEventHref,
} from "@/lib/calendar";

export const PLANNER_CALENDAR_ACTION_BUTTON_CLASS =
  "ftc-filter-pill inline-flex h-8 min-w-[5.5rem] w-full items-center justify-center whitespace-nowrap";

const PLANNER_CALENDAR_ACTION_ROW_CLASS = "grid grid-cols-2 items-center gap-2";

const PLANNER_CALENDAR_ACTION_SLOT_RESERVE_CLASS = "h-8 w-full";

type PlannerCalendarActionButtonsProps = {
  dateKey: string;
  hasSavedEventPlans: boolean;
  className?: string;
  onCreateClick?: () => void;
  onPlansClick?: () => void;
};

export default function PlannerCalendarActionButtons({
  dateKey,
  hasSavedEventPlans,
  className = "",
  onCreateClick,
  onPlansClick,
}: PlannerCalendarActionButtonsProps) {
  const createHref = buildPlannerCreateEventHref(dateKey);
  const plansHref = buildPlannerCreateEventFromPlansHref(dateKey);

  return (
    <div className={`${PLANNER_CALENDAR_ACTION_ROW_CLASS} ${className}`}>
      <div className="min-w-0">
        {onCreateClick ? (
          <button
            type="button"
            onClick={onCreateClick}
            className={PLANNER_CALENDAR_ACTION_BUTTON_CLASS}
          >
            Create event
          </button>
        ) : (
          <Link
            href={createHref}
            scroll={false}
            className={PLANNER_CALENDAR_ACTION_BUTTON_CLASS}
          >
            Create event
          </Link>
        )}
      </div>

      <div className="min-w-0">
        {hasSavedEventPlans ? (
          onPlansClick ? (
            <button type="button" onClick={onPlansClick} className={PLANNER_CALENDAR_ACTION_BUTTON_CLASS}>
              Event Plans
            </button>
          ) : (
            <Link href={plansHref} scroll={false} className={PLANNER_CALENDAR_ACTION_BUTTON_CLASS}>
              Event Plans
            </Link>
          )
        ) : (
          <div
            className={PLANNER_CALENDAR_ACTION_SLOT_RESERVE_CLASS}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
