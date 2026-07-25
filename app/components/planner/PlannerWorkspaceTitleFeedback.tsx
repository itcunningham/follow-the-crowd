import { PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS } from "@/lib/design/inlineTabFeedback";

type PlannerWorkspaceTitleFeedbackProps = {
  message: string | null;
  fading: boolean;
};

/** Centred history-removal success overlay in the planner title row (Events + Gigs). */
export function PlannerWorkspaceTitleFeedback({
  message,
  fading,
}: PlannerWorkspaceTitleFeedbackProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex min-h-[2.75rem] items-center justify-center px-16 sm:px-20 md:px-[12.5rem]"
      aria-live="polite"
    >
      <p
        className={`${PLANNER_WORKSPACE_TITLE_FEEDBACK_CLASS} ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
