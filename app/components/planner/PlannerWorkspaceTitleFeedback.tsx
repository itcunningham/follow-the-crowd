import { InlineTabFeedbackMessage } from "@/app/components/feedback/InlineTabFeedbackMessage";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS } from "@/lib/design/plannerWorkspaceTokens";

type PlannerWorkspaceTitleFeedbackProps = {
  message: string | null;
  fading: boolean;
};

/** Centred history-removal success row below the planner title row (Events + Gigs). */
export function PlannerWorkspaceTitleFeedback({
  message,
  fading,
}: PlannerWorkspaceTitleFeedbackProps) {
  return (
    <div
      className={PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS}
      aria-live={message ? "polite" : undefined}
    >
      <InlineTabFeedbackMessage message={message} fading={fading} />
    </div>
  );
}
