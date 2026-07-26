import {
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
  PLANNER_WORKSPACE_TITLE_ROW_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";
import { PlannerTitleFeedbackAnchor } from "@/app/components/planner/PlannerTitleFeedbackAnchor";

/** Zero-height sticky anchor band matching workspace title-row feedback geometry. */
export function PlannerTitleFeedbackAnchorBand() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky top-0 z-[55] h-0 w-full overflow-visible md:top-12"
    >
      <div className={`mx-auto w-full max-w-2xl md:max-w-5xl ${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pt-4`}>
        <div className={`${PLANNER_WORKSPACE_TITLE_ROW_CLASS} relative`}>
          <PlannerTitleFeedbackAnchor />
        </div>
      </div>
    </div>
  );
}
