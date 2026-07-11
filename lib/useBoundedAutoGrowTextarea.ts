"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

type TextareaRowBounds = {
  minHeight: number;
  maxHeight: number;
};

function resolveLineHeight(textarea: HTMLTextAreaElement, style: CSSStyleDeclaration): number {
  const lineHeight = parseFloat(style.lineHeight);

  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }

  const fontSize = parseFloat(style.fontSize);

  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * 1.2;
  }

  return 20;
}

function measureTextareaRowBounds(
  textarea: HTMLTextAreaElement,
  minRows: number,
  maxRows: number,
): TextareaRowBounds {
  const style = window.getComputedStyle(textarea);
  const lineHeight = resolveLineHeight(textarea, style);
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const borderBottom = parseFloat(style.borderBottomWidth) || 0;
  const blockExtra = paddingTop + paddingBottom + borderTop + borderBottom;

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

function applyBoundedTextareaHeight(textarea: HTMLTextAreaElement, bounds: TextareaRowBounds): void {
  textarea.style.maxHeight = `${bounds.maxHeight}px`;
  textarea.style.minHeight = `${bounds.minHeight}px`;
  textarea.style.height = `${bounds.minHeight}px`;
  textarea.style.overflowY = "hidden";

  const scrollHeight = textarea.scrollHeight;
  const nextHeight = Math.min(Math.max(scrollHeight, bounds.minHeight), bounds.maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = scrollHeight > bounds.maxHeight ? "auto" : "hidden";
}

export function useBoundedAutoGrowTextarea({
  value,
  minRows = DEFAULT_TEXTAREA_MIN_ROWS,
  maxRows = DEFAULT_TEXTAREA_MAX_ROWS,
}: {
  value: string;
  minRows?: number;
  maxRows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boundsRef = useRef<TextareaRowBounds | null>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    if (boundsRef.current === null) {
      boundsRef.current = measureTextareaRowBounds(textarea, minRows, maxRows);
    }

    applyBoundedTextareaHeight(textarea, boundsRef.current);
  }, [minRows, maxRows]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useLayoutEffect(() => {
    function handleResize() {
      boundsRef.current = null;
      adjustHeight();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}
