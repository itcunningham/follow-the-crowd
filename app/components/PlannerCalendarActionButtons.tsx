"use client";

import Link from "next/link";
import {
  buildPlannerCreateEventFromPlansHref,
  buildPlannerCreateEventHref,
} from "@/lib/calendar";

export const PLANNER_CALENDAR_CREATE_EVENT_BUTTON_CLASS =
  "ftc-btn-primary inline-flex h-8 min-w-[5.5rem] flex-1 items-center justify-center px-3 text-[0.6875rem] font-bold uppercase tracking-[0.06em]";

export const PLANNER_CALENDAR_SAVED_PLANS_BUTTON_CLASS =
  "ftc-filter-pill inline-flex h-8 min-w-[5.5rem] flex-1 items-center justify-center whitespace-nowrap";

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
    <div
      className={`flex items-center gap-2 ${hasSavedEventPlans ? "w-full max-w-[18.5rem] sm:max-w-none sm:w-auto" : ""} ${className}`}
    >
      {onCreateClick ? (
        <button
          type="button"
          onClick={onCreateClick}
          className={`${PLANNER_CALENDAR_CREATE_EVENT_BUTTON_CLASS}${hasSavedEventPlans ? "" : " !flex-none"}`}
        >
          Create Event
        </button>
      ) : (
        <Link
          href={createHref}
          className={`${PLANNER_CALENDAR_CREATE_EVENT_BUTTON_CLASS}${hasSavedEventPlans ? "" : " !flex-none"}`}
        >
          Create Event
        </Link>
      )}

      {hasSavedEventPlans ? (
        onPlansClick ? (
          <button
            type="button"
            onClick={onPlansClick}
            className={PLANNER_CALENDAR_SAVED_PLANS_BUTTON_CLASS}
          >
            Saved Event Plans
          </button>
        ) : (
          <Link href={plansHref} className={PLANNER_CALENDAR_SAVED_PLANS_BUTTON_CLASS}>
            Saved Event Plans
          </Link>
        )
      ) : null}
    </div>
  );
}
