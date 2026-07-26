"use client";

import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import {
  PLANNER_EVENT_DETAIL_TITLE_FEEDBACK_SLOT_CLASS,
  PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

type PlannerTitleFeedbackSlotProps = {
  /** Event Details centres feedback in the header band; Gigs uses default below-row offset. */
  variant?: "workspace" | "event-detail";
};

/** Inline page-header success notification slot — same placement as Gigs History. */
export function PlannerTitleFeedbackSlot({ variant = "workspace" }: PlannerTitleFeedbackSlotProps) {
  const { message, fading } = usePlannerTitleFeedbackState();

  if (!message) {
    return null;
  }

  const className =
    variant === "event-detail"
      ? PLANNER_EVENT_DETAIL_TITLE_FEEDBACK_SLOT_CLASS
      : PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS;

  return (
    <div className={className} aria-live="polite">
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>
  );
}
