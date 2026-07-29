export type BoundsRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type ReactionPickerPlacement = "above" | "below";

export const REACTION_PICKER_MESSAGE_GAP_PX = 8;
export const REACTION_PICKER_VIEWPORT_PADDING_PX = 8;

const SAFE_AREA_PROBE_SIDES = ["top", "right", "bottom", "left"] as const;

type SafeAreaInsets = Record<(typeof SAFE_AREA_PROBE_SIDES)[number], number>;

let cachedSafeAreaInsets: SafeAreaInsets | null = null;

function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (cachedSafeAreaInsets) {
    return cachedSafeAreaInsets;
  }

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingTop = "env(safe-area-inset-top)";
  probe.style.paddingRight = "env(safe-area-inset-right)";
  probe.style.paddingBottom = "env(safe-area-inset-bottom)";
  probe.style.paddingLeft = "env(safe-area-inset-left)";
  document.body.appendChild(probe);

  const computed = getComputedStyle(probe);
  cachedSafeAreaInsets = {
    top: Number.parseFloat(computed.paddingTop) || 0,
    right: Number.parseFloat(computed.paddingRight) || 0,
    bottom: Number.parseFloat(computed.paddingBottom) || 0,
    left: Number.parseFloat(computed.paddingLeft) || 0,
  };

  document.body.removeChild(probe);
  return cachedSafeAreaInsets;
}

export function clearReactionPickerSafeAreaCache(): void {
  cachedSafeAreaInsets = null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getVisualViewportRect(): BoundsRect {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, width: 0, height: 0 };
  }

  const viewport = window.visualViewport;
  const safeArea = readSafeAreaInsets();
  const padding = REACTION_PICKER_VIEWPORT_PADDING_PX;

  const top = (viewport?.offsetTop ?? 0) + safeArea.top + padding;
  const left = safeArea.left + padding;
  const width =
    (viewport?.width ?? window.innerWidth) - safeArea.left - safeArea.right - padding * 2;
  const height =
    (viewport?.height ?? window.innerHeight) - safeArea.top - safeArea.bottom - padding * 2;

  return {
    top,
    left,
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
}

function readElementBottom(selector: string): number | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(selector);

  if (!(element instanceof HTMLElement)) {
    return null;
  }

  return element.getBoundingClientRect().bottom;
}

function readElementTop(selector: string): number | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(selector);

  if (!(element instanceof HTMLElement)) {
    return null;
  }

  return element.getBoundingClientRect().top;
}

/** Visible chat overlay bounds: visual viewport minus header/composer chrome. */
export function getReactionPickerViewportBounds(): BoundsRect {
  const viewport = getVisualViewportRect();
  const headerBottom = readElementBottom("[data-chat-header]");
  const composerTop = readElementTop("[data-chat-composer]");

  let top = viewport.top;
  let bottom = viewport.top + viewport.height;

  if (headerBottom !== null) {
    top = Math.max(top, headerBottom + REACTION_PICKER_MESSAGE_GAP_PX);
  }

  if (composerTop !== null) {
    bottom = Math.min(bottom, composerTop - REACTION_PICKER_MESSAGE_GAP_PX);
  }

  const height = Math.max(0, bottom - top);

  return {
    top,
    left: viewport.left,
    width: viewport.width,
    height,
  };
}

export function computeReactionPickerPosition({
  anchorRect,
  pickerWidth,
  pickerHeight,
  isOwnMessage,
  viewport = getReactionPickerViewportBounds(),
  gap = REACTION_PICKER_MESSAGE_GAP_PX,
}: {
  anchorRect: DOMRectReadOnly;
  pickerWidth: number;
  pickerHeight: number;
  isOwnMessage: boolean;
  viewport?: BoundsRect;
  gap?: number;
}): {
  top: number;
  left: number;
  placement: ReactionPickerPlacement;
} {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;

  const spaceAbove = anchorRect.top - viewport.top;
  const spaceBelow = viewportBottom - anchorRect.bottom;

  const fitsAbove = spaceAbove >= pickerHeight + gap;
  const fitsBelow = spaceBelow >= pickerHeight + gap;

  let placement: ReactionPickerPlacement = "above";

  if (fitsAbove) {
    placement = "above";
  } else if (fitsBelow) {
    placement = "below";
  } else {
    placement = spaceBelow >= spaceAbove ? "below" : "above";
  }

  let top =
    placement === "above"
      ? anchorRect.top - gap - pickerHeight
      : anchorRect.bottom + gap;

  top = clamp(top, viewport.top, Math.max(viewport.top, viewportBottom - pickerHeight));

  const preferredLeft = isOwnMessage
    ? anchorRect.right - pickerWidth
    : anchorRect.left;

  const left = clamp(
    preferredLeft,
    viewport.left,
    Math.max(viewport.left, viewportRight - pickerWidth),
  );

  return { top, left, placement };
}
