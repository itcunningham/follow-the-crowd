"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

type TextareaHeightBounds = {
  minHeight: number;
  maxHeight: number;
};

function buildProbeValue(rowCount: number): string {
  return Array.from({ length: rowCount }, () => "\u00a0").join("\n");
}

function measureTextareaScrollHeight(source: HTMLTextAreaElement, value: string): number {
  const width = source.getBoundingClientRect().width;

  if (width <= 0) {
    return 0;
  }

  const clone = source.cloneNode(false) as HTMLTextAreaElement;

  clone.value = value;
  clone.style.position = "absolute";
  clone.style.top = "-9999px";
  clone.style.left = "0";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.width = `${width}px`;
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxHeight = "none";
  clone.style.overflow = "hidden";

  document.body.appendChild(clone);
  const height = clone.scrollHeight;
  clone.remove();

  return height;
}

function measureTextareaRowBounds(
  textarea: HTMLTextAreaElement,
  minRows: number,
  maxRows: number,
): TextareaHeightBounds {
  return {
    minHeight: measureTextareaScrollHeight(textarea, buildProbeValue(minRows)),
    maxHeight: measureTextareaScrollHeight(textarea, buildProbeValue(maxRows)),
  };
}

export function applyBoundedTextareaHeight(
  textarea: HTMLTextAreaElement,
  bounds?: TextareaHeightBounds,
  minRows = DEFAULT_TEXTAREA_MIN_ROWS,
  maxRows = DEFAULT_TEXTAREA_MAX_ROWS,
): void {
  const resolvedBounds = bounds ?? measureTextareaRowBounds(textarea, minRows, maxRows);
  const { minHeight, maxHeight } = resolvedBounds;

  if (maxHeight <= 0) {
    return;
  }

  const contentHeight = measureTextareaScrollHeight(textarea, textarea.value);

  if (contentHeight <= 0) {
    return;
  }

  const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);

  textarea.style.setProperty("box-sizing", "border-box");
  textarea.style.setProperty("resize", "none");
  textarea.style.setProperty("min-height", `${minHeight}px`, "important");
  textarea.style.setProperty("max-height", `${maxHeight}px`, "important");
  textarea.style.setProperty("height", `${nextHeight}px`, "important");
  textarea.style.setProperty("overflow-x", "hidden");
  textarea.style.setProperty(
    "overflow-y",
    contentHeight > maxHeight ? "auto" : "hidden",
    "important",
  );
}

export function useBoundedAutoGrowTextarea({ value }: { value: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boundsRef = useRef<TextareaHeightBounds | null>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    if (textarea.getBoundingClientRect().width <= 0) {
      return;
    }

    if (boundsRef.current === null) {
      boundsRef.current = measureTextareaRowBounds(
        textarea,
        DEFAULT_TEXTAREA_MIN_ROWS,
        DEFAULT_TEXTAREA_MAX_ROWS,
      );
    }

    applyBoundedTextareaHeight(textarea, boundsRef.current);
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    function invalidateBounds() {
      boundsRef.current = null;
      adjustHeight();
    }

    const resizeObserver = new ResizeObserver(invalidateBounds);

    resizeObserver.observe(textarea);
    window.addEventListener("resize", invalidateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", invalidateBounds);
    };
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}
