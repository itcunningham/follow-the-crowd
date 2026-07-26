import { InlineTabFeedbackMessage } from "@/app/components/feedback/InlineTabFeedbackMessage";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS } from "@/lib/design/plannerWorkspaceTokens";

type PlannerWorkspaceTitleFeedbackProps = {
  message: string | null;
  fading: boolean;
};

/** Centred floating planner title-row success feedback (Events History, Gigs History, Event Details). */
export function PlannerWorkspaceTitleFeedback({
  message,
  fading,
}: PlannerWorkspaceTitleFeedbackProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={PLANNER_WORKSPACE_TITLE_FEEDBACK_SLOT_CLASS} aria-live="polite">
      <InlineTabFeedbackMessage message={message} fading={fading} />
    </div>
  );
}
