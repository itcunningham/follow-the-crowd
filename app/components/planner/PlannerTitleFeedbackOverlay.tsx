"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_OVERLAY_CLASS } from "@/lib/design/plannerWorkspaceTokens";

export const PLANNER_TITLE_FEEDBACK_ANCHOR_SELECTOR = "[data-planner-title-feedback-anchor]";

/** Portal overlay positioned from the shared workspace title-row feedback anchor. */
export function PlannerTitleFeedbackOverlay() {
  const { message, fading } = usePlannerTitleFeedbackState();
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!message) {
      setStyle(null);
      return;
    }

    function updatePosition() {
      const anchor = document.querySelector(PLANNER_TITLE_FEEDBACK_ANCHOR_SELECTOR);

      if (!anchor) {
        setStyle(null);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setStyle({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [message]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !message || !style) {
    return null;
  }

  return createPortal(
    <div
      className={PLANNER_WORKSPACE_TITLE_FEEDBACK_OVERLAY_CLASS}
      style={{ top: style.top, left: style.left, width: style.width }}
      aria-live="polite"
    >
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>,
    document.body,
  );
}
