"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

type TextareaRowBounds = {
  minHeight: number;
  maxHeight: number;
};

type TextareaStyleSnapshot = {
  value: string;
  height: string;
  minHeight: string;
  maxHeight: string;
  overflowY: string;
  rows: number;
};

function captureTextareaStyle(textarea: HTMLTextAreaElement): TextareaStyleSnapshot {
  return {
    value: textarea.value,
    height: textarea.style.height,
    minHeight: textarea.style.minHeight,
    maxHeight: textarea.style.maxHeight,
    overflowY: textarea.style.overflowY,
    rows: textarea.rows,
  };
}

function restoreTextareaStyle(textarea: HTMLTextAreaElement, saved: TextareaStyleSnapshot): void {
  textarea.value = saved.value;
  textarea.rows = saved.rows;
  textarea.style.height = saved.height;
  textarea.style.minHeight = saved.minHeight;
  textarea.style.maxHeight = saved.maxHeight;
  textarea.style.overflowY = saved.overflowY;
}

function buildProbeValue(rowCount: number): string {
  return Array.from({ length: rowCount }, () => " ").join("\n");
}

function measureHeightForRowCount(textarea: HTMLTextAreaElement, rowCount: number): number {
  const saved = captureTextareaStyle(textarea);

  textarea.rows = 1;
  textarea.value = buildProbeValue(rowCount);
  textarea.style.height = "auto";
  textarea.style.minHeight = "0";
  textarea.style.maxHeight = "none";
  textarea.style.overflowY = "hidden";

  const height = textarea.scrollHeight;

  restoreTextareaStyle(textarea, saved);

  return height;
}

function measureTextareaRowBounds(
  textarea: HTMLTextAreaElement,
  minRows: number,
  maxRows: number,
): TextareaRowBounds {
  return {
    minHeight: measureHeightForRowCount(textarea, minRows),
    maxHeight: measureHeightForRowCount(textarea, maxRows),
  };
}

function measureContentScrollHeight(textarea: HTMLTextAreaElement): number {
  textarea.style.minHeight = "0";
  textarea.style.maxHeight = "none";
  textarea.style.overflowY = "hidden";
  textarea.style.height = "0px";

  return textarea.scrollHeight;
}

function applyBoundedTextareaHeight(textarea: HTMLTextAreaElement, bounds: TextareaRowBounds): void {
  const scrollHeight = measureContentScrollHeight(textarea);
  const nextHeight = Math.min(Math.max(scrollHeight, bounds.minHeight), bounds.maxHeight);

  textarea.style.boxSizing = "border-box";
  textarea.style.minHeight = `${bounds.minHeight}px`;
  textarea.style.maxHeight = `${bounds.maxHeight}px`;
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
