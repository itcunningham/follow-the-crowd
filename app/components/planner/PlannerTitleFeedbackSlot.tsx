"use client";

import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import {
  PLANNER_WORKSPACE_TITLE_FEEDBACK_IN_ROW_CLASS,
  PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

type PlannerTitleFeedbackSlotProps = {
  /** Gigs workspace title row — below heading, above tabs. */
  placement?: "below-row" | "in-row";
};

/** Inline page-header success notification slot — not a global toast. */
export function PlannerTitleFeedbackSlot({ placement = "below-row" }: PlannerTitleFeedbackSlotProps) {
  const { message, fading } = usePlannerTitleFeedbackState();

  if (!message) {
    return null;
  }

  const className =
    placement === "in-row"
      ? PLANNER_WORKSPACE_TITLE_FEEDBACK_IN_ROW_CLASS
      : PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS;

  return (
    <div className={className} aria-live="polite">
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>
  );
}
