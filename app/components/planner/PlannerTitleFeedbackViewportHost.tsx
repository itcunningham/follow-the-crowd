import { PlannerTitleFeedbackSlot } from "@/app/components/planner/PlannerTitleFeedbackSlot";
import {
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
  PLANNER_WORKSPACE_TITLE_ROW_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";

/** Shared zero-layout host — Gigs-reference title-row geometry for all planner title feedback. */
export function PlannerTitleFeedbackViewportHost() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0 overflow-visible md:top-12"
    >
      <div className={`mx-auto w-full max-w-2xl md:max-w-5xl ${PLANNER_WORKSPACE_PAGE_INSET_CLASS} pt-4`}>
        <div className={`${PLANNER_WORKSPACE_TITLE_ROW_CLASS} relative`}>
          <PlannerTitleFeedbackSlot />
        </div>
      </div>
    </div>
  );
}
