import {
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
  PLANNER_WORKSPACE_TITLE_ROW_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

/** Zero-layout anchor matching workspace title-row feedback position (Gigs reference). */
export function PlannerTitleFeedbackAnchor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-0 h-0 overflow-visible md:top-12"
    >
      <div className={`mx-auto w-full max-w-2xl md:max-w-5xl ${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pt-4`}>
        <div className={`${PLANNER_WORKSPACE_TITLE_ROW_CLASS} relative`}>
          <div
            data-planner-title-feedback-anchor
            className="pointer-events-none absolute inset-x-0 top-full mt-1.5 h-0"
          />
        </div>
      </div>
    </div>
  );
}
