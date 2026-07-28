const MESSAGE_HISTORY_INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, [contenteditable='true'], [role='button']";

/**
 * Returns true when a touch may begin the intercepted message-history gesture.
 * Touches on the composer or in-scroll interactive controls are excluded.
 */
export function isValidMessageHistoryGestureStart(
  target: EventTarget | null,
  scrollContainer: HTMLElement,
  composerRoot: HTMLElement | null,
): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  if (!scrollContainer.contains(target)) {
    return false;
  }

  if (composerRoot?.contains(target)) {
    return false;
  }

  if (target instanceof Element) {
    const interactiveAncestor = target.closest(MESSAGE_HISTORY_INTERACTIVE_SELECTOR);

    if (interactiveAncestor && scrollContainer.contains(interactiveAncestor)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true when a touchmove on the composer chrome should be stabilized
 * (prevent page/shell rubber-band) without entering message-history scrolling.
 * Input and contenteditable touches are excluded so selection/cursor still work.
 */
export function shouldStabilizeComposerTouchMove(
  target: EventTarget | null,
  composerRoot: HTMLElement,
): boolean {
  if (!(target instanceof Node) || !composerRoot.contains(target)) {
    return false;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return false;
  }

  if (target instanceof Element && target.closest("[contenteditable='true']")) {
    return false;
  }

  return true;
}
