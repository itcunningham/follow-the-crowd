"use client";

import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS } from "@/lib/design/plannerWorkspaceTokens";

/** Inline page-header success notification slot — same placement as Gigs History. */
export function PlannerTitleFeedbackSlot() {
  const { message, fading } = usePlannerTitleFeedbackState();

  if (!message) {
    return null;
  }

  return (
    <div className={PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS} aria-live="polite">
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>
  );
}
