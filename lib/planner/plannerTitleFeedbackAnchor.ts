/** DOM selector for the shared planner title-row feedback anchor. */
export const PLANNER_TITLE_FEEDBACK_ANCHOR_SELECTOR = "[data-planner-title-feedback-anchor]";

/** Prefer the last matching anchor so route-specific markers override the global fallback. */
export function resolvePlannerTitleFeedbackAnchor(): Element | null {
  const anchors = document.querySelectorAll(PLANNER_TITLE_FEEDBACK_ANCHOR_SELECTOR);

  if (anchors.length === 0) {
    return null;
  }

  return anchors[anchors.length - 1] ?? null;
}
