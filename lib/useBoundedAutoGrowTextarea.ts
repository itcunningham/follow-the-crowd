"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { countEventNotesLines } from "@/lib/events/eventNotes";

export const EVENT_NOTES_MIN_ROWS = 4;
export const EVENT_NOTES_MAX_ROWS = 8;

function readHeightBounds(textarea: HTMLTextAreaElement): {
  minHeight: number;
  maxHeight: number;
} | null {
  const style = window.getComputedStyle(textarea);
  const minHeight = parseFloat(style.minHeight);
  const maxHeight = parseFloat(style.maxHeight);

  if (!Number.isFinite(minHeight) || !Number.isFinite(maxHeight) || maxHeight <= 0) {
    return null;
  }

  return { minHeight, maxHeight };
}

function heightForLineCount(
  lineCount: number,
  minHeight: number,
  maxHeight: number,
): number {
  const clampedLines = Math.min(Math.max(lineCount, 1), EVENT_NOTES_MAX_ROWS);
  const growth = (clampedLines - 1) / (EVENT_NOTES_MAX_ROWS - 1);

  return minHeight + growth * (maxHeight - minHeight);
}

export function applyBoundedTextareaHeight(
  textarea: HTMLTextAreaElement,
  value = textarea.value,
): void {
  const bounds = readHeightBounds(textarea);

  if (!bounds) {
    return;
  }

  const { minHeight, maxHeight } = bounds;
  const lineCount = countEventNotesLines(value);
  const nextHeight = heightForLineCount(lineCount, minHeight, maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = "hidden";
}

export function useBoundedAutoGrowTextarea({ value }: { value: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    applyBoundedTextareaHeight(textarea, value);
  }, [value]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

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
