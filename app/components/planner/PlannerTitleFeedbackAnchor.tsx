import { PLANNER_WORKSPACE_TITLE_FEEDBACK_ANCHOR_CLASS } from "@/lib/design/plannerWorkspaceTokens";

/** Marks the shared workspace title-row feedback position (Gigs History, Event Details, etc.). */
export function PlannerTitleFeedbackAnchor() {
  return (
    <div
      data-planner-title-feedback-anchor
      className={PLANNER_WORKSPACE_TITLE_FEEDBACK_ANCHOR_CLASS}
      aria-hidden="true"
    />
  );
}
