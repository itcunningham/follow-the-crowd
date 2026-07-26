"use client";

import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import {
  PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_SLOT_CLASS,
  PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

type PlannerTitleFeedbackSlotProps = {
  /** Event Details — centred in Back/Edit row; Gigs — below workspace title row. */
  variant?: "workspace" | "header-controls";
};

/** Inline page-header success notification slot. */
export function PlannerTitleFeedbackSlot({ variant = "workspace" }: PlannerTitleFeedbackSlotProps) {
  const { message, fading } = usePlannerTitleFeedbackState();

  if (!message) {
    return null;
  }

  const className =
    variant === "header-controls"
      ? PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_SLOT_CLASS
      : PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS;

  return (
    <div className={className} aria-live="polite">
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>
  );
}
