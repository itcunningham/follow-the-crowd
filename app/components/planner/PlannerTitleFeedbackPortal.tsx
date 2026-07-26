"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_PORTAL_CLASS } from "@/lib/design/plannerWorkspaceTokens";
import { usesPlannerWorkspaceTitleFeedbackSlot } from "@/lib/planner/plannerTitleFeedbackRoutes";

/**
 * Provider-mounted portal for routes outside planner workspace layout (Event Details).
 * Workspace routes render via PlannerTitleFeedbackSlot in PlannerWorkspacePageHeader.
 */
export function PlannerTitleFeedbackPortal() {
  const pathname = usePathname();
  const { message, fading } = usePlannerTitleFeedbackState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !message || usesPlannerWorkspaceTitleFeedbackSlot(pathname)) {
    return null;
  }

  return createPortal(
    <div className={PLANNER_WORKSPACE_TITLE_FEEDBACK_PORTAL_CLASS} aria-live="polite">
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>,
    document.body,
  );
}
