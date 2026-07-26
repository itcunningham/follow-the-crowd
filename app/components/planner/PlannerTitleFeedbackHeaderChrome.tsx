import {
  PLANNER_WORKSPACE_HEADER_CLASS,
  PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS,
  PLANNER_WORKSPACE_TITLE_ROW_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";
import { PlannerTitleFeedbackSlot } from "@/app/components/planner/PlannerTitleFeedbackSlot";

/**
 * Workspace-equivalent header chrome for routes outside planner workspace layout.
 * Uses the same header classes and slot as PlannerWorkspacePageHeader (Gigs).
 */
export function PlannerTitleFeedbackHeaderChrome() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky top-0 z-[55] h-0 w-full overflow-visible md:top-12"
    >
      <header className={`${PLANNER_WORKSPACE_HEADER_CLASS} absolute inset-x-0 top-0`}>
        <div className={`${PLANNER_WORKSPACE_TITLE_ROW_CLASS} relative`}>
          <PlannerTitleFeedbackSlot />
        </div>
        <div className={PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS} />
      </header>
    </div>
  );
}
