import { InlineTabFeedbackMessage } from "@/app/components/feedback/InlineTabFeedbackMessage";

type PlannerWorkspaceTitleFeedbackProps = {
  message: string | null;
  fading: boolean;
};

/** Centred planner title-row success feedback — positioning lives in PlannerTitleFeedbackProvider host. */
export function PlannerWorkspaceTitleFeedback({
  message,
  fading,
}: PlannerWorkspaceTitleFeedbackProps) {
  if (!message) {
    return null;
  }

  return <InlineTabFeedbackMessage message={message} fading={fading} />;
}
