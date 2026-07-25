"use client";

const MOBILE_REFERENCE_VIEWPORT_WIDTH = 390;
const BOOKING_SHEET_CONTENT_HORIZONTAL_PADDING = 40;

const STYLE_PROPERTIES = [
  "boxSizing",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "font",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "wordBreak",
  "overflowWrap",
  "whiteSpace",
  "textTransform",
] as const;

let mirrorTextarea: HTMLTextAreaElement | null = null;

function getMirrorTextarea(source: HTMLTextAreaElement): HTMLTextAreaElement {
  if (!mirrorTextarea) {
    mirrorTextarea = document.createElement("textarea");
    mirrorTextarea.tabIndex = -1;
    mirrorTextarea.setAttribute("aria-hidden", "true");
    mirrorTextarea.readOnly = true;
    Object.assign(mirrorTextarea.style, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      visibility: "hidden",
      pointerEvents: "none",
      overflow: "hidden",
      resize: "none",
      height: "auto",
      minHeight: "0",
      maxHeight: "none",
    });
    document.body.appendChild(mirrorTextarea);
  }

  mirrorTextarea.className = source.className;

  const computed = window.getComputedStyle(source);

  for (const property of STYLE_PROPERTIES) {
    mirrorTextarea.style[property] = computed[property];
  }

  return mirrorTextarea;
}

export function getWithdrawalReasonStrictMeasureWidth(textarea: HTMLTextAreaElement): number {
  const mobileStrictWidth = MOBILE_REFERENCE_VIEWPORT_WIDTH - BOOKING_SHEET_CONTENT_HORIZONTAL_PADDING;

  return Math.min(textarea.clientWidth, mobileStrictWidth);
}

export function getWithdrawalReasonMaxRenderedHeight(textarea: HTMLTextAreaElement): number {
  return parseFloat(window.getComputedStyle(textarea).maxHeight);
}

export function measureWithdrawalReasonContentHeight(
  textarea: HTMLTextAreaElement,
  value: string,
  width = getWithdrawalReasonStrictMeasureWidth(textarea),
): number {
  const mirror = getMirrorTextarea(textarea);

  mirror.style.width = `${width}px`;
  mirror.style.height = "auto";
  mirror.style.minHeight = "0";
  mirror.style.maxHeight = "none";
  mirror.value = value;

  return mirror.scrollHeight;
}

export function withdrawalReasonFitsVisibleRows(
  textarea: HTMLTextAreaElement,
  value: string,
): boolean {
  const maxHeight = getWithdrawalReasonMaxRenderedHeight(textarea);

  if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
    return true;
  }

  const contentHeight = measureWithdrawalReasonContentHeight(textarea, value);

  return contentHeight <= maxHeight + 0.5;
}

export function truncateWithdrawalReasonToVisibleRows(
  textarea: HTMLTextAreaElement,
  value: string,
): string {
  if (withdrawalReasonFitsVisibleRows(textarea, value)) {
    return value;
  }

  let low = 0;
  let high = value.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = value.slice(0, mid);

    if (withdrawalReasonFitsVisibleRows(textarea, candidate)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return value.slice(0, low);
}
