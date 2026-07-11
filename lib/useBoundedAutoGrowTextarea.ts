"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

function readHeightBounds(textarea: HTMLTextAreaElement): { minHeight: number; maxHeight: number } | null {
  const style = window.getComputedStyle(textarea);
  const minHeight = parseFloat(style.minHeight);
  const maxHeight = parseFloat(style.maxHeight);

  if (!Number.isFinite(minHeight) || !Number.isFinite(maxHeight) || maxHeight <= 0) {
    return null;
  }

  return { minHeight, maxHeight };
}

function applyBoundedTextareaHeight(textarea: HTMLTextAreaElement): void {
  const bounds = readHeightBounds(textarea);

  if (!bounds) {
    return;
  }

  const { minHeight, maxHeight } = bounds;

  textarea.style.height = "auto";
  const scrollHeight = textarea.scrollHeight;
  const nextHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
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
