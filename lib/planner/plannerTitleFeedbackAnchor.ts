/** DOM selector for the Gigs-reference planner title-row feedback anchor. */
export const PLANNER_TITLE_FEEDBACK_ANCHOR_SELECTOR = "[data-planner-title-feedback-anchor]";

/** Sole positioning source — shared by Gigs, Event Details, and workspace routes. */
export function getPlannerTitleFeedbackAnchor(): Element | null {
  return document.querySelector(PLANNER_TITLE_FEEDBACK_ANCHOR_SELECTOR);
}
