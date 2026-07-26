import { InlineTabFeedbackMessage } from "@/app/components/feedback/InlineTabFeedbackMessage";

type PlannerWorkspaceTitleFeedbackProps = {
  message: string | null;
  fading: boolean;
};

/** Centred planner title-row success feedback — positioned via PlannerTitleFeedbackMount slot. */
export function PlannerWorkspaceTitleFeedback({
  message,
  fading,
}: PlannerWorkspaceTitleFeedbackProps) {
  if (!message) {
    return null;
  }

  return <InlineTabFeedbackMessage message={message} fading={fading} />;
}
