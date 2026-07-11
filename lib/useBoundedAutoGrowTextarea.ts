"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

type TextareaHeightBounds = {
  minHeight: number;
  maxHeight: number;
};

const MIRROR_STYLE_PROPERTIES = [
  "boxSizing",
  "width",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "textTransform",
  "wordSpacing",
  "textIndent",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
] as const;

function resolveLineHeight(textarea: HTMLTextAreaElement, style: CSSStyleDeclaration): number {
  const lineHeight = parseFloat(style.lineHeight);

  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }

  const fontSize = parseFloat(style.fontSize);

  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * 1.5;
  }

  return 20;
}

function fallbackHeightBounds(
  textarea: HTMLTextAreaElement,
  minRows: number,
  maxRows: number,
): TextareaHeightBounds {
  const style = window.getComputedStyle(textarea);
  const lineHeight = resolveLineHeight(textarea, style);
  const blockExtra =
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0) +
    (parseFloat(style.borderTopWidth) || 0) +
    (parseFloat(style.borderBottomWidth) || 0);

  if (style.boxSizing === "border-box") {
    return {
      minHeight: lineHeight * minRows + blockExtra,
      maxHeight: lineHeight * maxRows + blockExtra,
    };
  }

  return {
    minHeight: lineHeight * minRows,
    maxHeight: lineHeight * maxRows,
  };
}

function readHeightBounds(
  textarea: HTMLTextAreaElement,
  minRows: number,
  maxRows: number,
): TextareaHeightBounds {
  const style = window.getComputedStyle(textarea);
  const minHeight = parseFloat(style.minHeight);
  const maxHeight = parseFloat(style.maxHeight);

  if (Number.isFinite(minHeight) && Number.isFinite(maxHeight) && maxHeight > 0) {
    return { minHeight, maxHeight };
  }

  return fallbackHeightBounds(textarea, minRows, maxRows);
}

function measureTextareaContentHeight(textarea: HTMLTextAreaElement): number {
  const style = window.getComputedStyle(textarea);
  const width = textarea.getBoundingClientRect().width;

  if (width <= 0) {
    return textarea.scrollHeight;
  }

  const mirror = document.createElement("div");

  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.overflow = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.width = `${width}px`;

  for (const property of MIRROR_STYLE_PROPERTIES) {
    mirror.style[property] = style[property];
  }

  mirror.textContent = textarea.value;

  if (textarea.value.endsWith("\n")) {
    mirror.append(document.createTextNode("\u00a0"));
  }

  document.body.appendChild(mirror);
  const contentHeight = mirror.scrollHeight;
  mirror.remove();

  return contentHeight;
}

export function applyBoundedTextareaHeight(
  textarea: HTMLTextAreaElement,
  minRows = DEFAULT_TEXTAREA_MIN_ROWS,
  maxRows = DEFAULT_TEXTAREA_MAX_ROWS,
): void {
  const { minHeight, maxHeight } = readHeightBounds(textarea, minRows, maxRows);
  const contentHeight = measureTextareaContentHeight(textarea);
  const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);

  textarea.style.boxSizing = "border-box";
  textarea.style.minHeight = `${minHeight}px`;
  textarea.style.maxHeight = `${maxHeight}px`;
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowX = "hidden";
  textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
}

export function useBoundedAutoGrowTextarea({ value }: { value: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    applyBoundedTextareaHeight(textarea);
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useLayoutEffect(() => {
    function handleResize() {
      adjustHeight();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}
