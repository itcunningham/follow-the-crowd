"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

type TextareaHeightBounds = {
  minHeight: number;
  maxHeight: number;
};

function resolveLineHeight(style: CSSStyleDeclaration): number {
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

function getBlockExtra(style: CSSStyleDeclaration): number {
  return (
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0) +
    (parseFloat(style.borderTopWidth) || 0) +
    (parseFloat(style.borderBottomWidth) || 0)
  );
}

function getTextareaHeightBounds(textarea: HTMLTextAreaElement): TextareaHeightBounds {
  const style = window.getComputedStyle(textarea);
  const blockExtra = getBlockExtra(style);
  const lineHeight = resolveLineHeight(style);
  const parsedMinHeight = parseFloat(style.minHeight);
  const parsedMaxHeight = parseFloat(style.maxHeight);

  if (Number.isFinite(parsedMinHeight) && Number.isFinite(parsedMaxHeight) && parsedMaxHeight > 0) {
    return {
      minHeight: parsedMinHeight,
      maxHeight: parsedMaxHeight,
    };
  }

  if (style.boxSizing === "border-box") {
    return {
      minHeight: lineHeight * DEFAULT_TEXTAREA_MIN_ROWS + blockExtra,
      maxHeight: lineHeight * DEFAULT_TEXTAREA_MAX_ROWS + blockExtra,
    };
  }

  return {
    minHeight: lineHeight * DEFAULT_TEXTAREA_MIN_ROWS,
    maxHeight: lineHeight * DEFAULT_TEXTAREA_MAX_ROWS,
  };
}

export function applyBoundedTextareaHeight(textarea: HTMLTextAreaElement): void {
  const { minHeight, maxHeight } = getTextareaHeightBounds(textarea);

  textarea.style.setProperty("box-sizing", "border-box", "important");
  textarea.style.setProperty("resize", "none", "important");
  textarea.style.setProperty("overflow-x", "hidden", "important");
  textarea.style.setProperty("min-height", `${minHeight}px`, "important");
  textarea.style.setProperty("max-height", `${maxHeight}px`, "important");

  textarea.style.setProperty("height", `${minHeight}px`, "important");
  const scrollHeight = textarea.scrollHeight;
  const nextHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

  textarea.style.setProperty("height", `${nextHeight}px`, "important");
  textarea.style.setProperty(
    "overflow-y",
    scrollHeight > maxHeight ? "auto" : "hidden",
    "important",
  );
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
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      adjustHeight();
    });

    resizeObserver.observe(textarea);
    window.addEventListener("resize", adjustHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", adjustHeight);
    };
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}
