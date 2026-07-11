"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

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

function measureTextareaContentHeight(textarea: HTMLTextAreaElement): number {
  const bounds = readHeightBounds(textarea);
  const width = textarea.getBoundingClientRect().width;

  if (!bounds || width <= 0) {
    return bounds?.minHeight ?? 0;
  }

  const clone = textarea.cloneNode(false) as HTMLTextAreaElement;
  const value = textarea.value.endsWith("\n") ? `${textarea.value}\u00a0` : textarea.value;

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
  const contentHeight = clone.scrollHeight;
  clone.remove();

  return contentHeight;
}

export function applyBoundedTextareaHeight(textarea: HTMLTextAreaElement): void {
  const bounds = readHeightBounds(textarea);

  if (!bounds) {
    return;
  }

  const { minHeight, maxHeight } = bounds;
  const contentHeight = measureTextareaContentHeight(textarea);
  const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);

  textarea.style.height = `${nextHeight}px`;
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
