"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlannerWorkspaceTitleFeedback } from "@/app/components/planner/PlannerWorkspaceTitleFeedback";
import { usePlannerTitleFeedbackState } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import { PLANNER_WORKSPACE_TITLE_FEEDBACK_HOST_CLASS } from "@/lib/design/plannerWorkspaceTokens";
import { resolvePlannerTitleFeedbackAnchor } from "@/lib/planner/plannerTitleFeedbackAnchor";

/** Shared success notification — single render path for Gigs, Event Details, and workspace routes. */
export function PlannerTitleFeedbackSlot() {
  const { message, fading } = usePlannerTitleFeedbackState();
  const [mounted, setMounted] = useState(false);
  const [hostStyle, setHostStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!message) {
      setHostStyle(null);
      return;
    }

    function updatePosition() {
      const anchor = resolvePlannerTitleFeedbackAnchor();

      if (!anchor) {
        setHostStyle(null);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setHostStyle({
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

  if (!mounted || !message || !hostStyle) {
    return null;
  }

  return createPortal(
    <div
      className={`${PLANNER_WORKSPACE_TITLE_FEEDBACK_HOST_CLASS} fixed`}
      style={{ top: hostStyle.top, left: hostStyle.left, width: hostStyle.width }}
      aria-live="polite"
    >
      <PlannerWorkspaceTitleFeedback message={message} fading={fading} />
    </div>,
    document.body,
  );
}
