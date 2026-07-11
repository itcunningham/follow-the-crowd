"use client";

import { useCallback, useEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

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
  const boundsRef = useRef<{ minHeight: number; maxHeight: number } | null>(null);

  const measureBounds = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return null;
    }

    const saved = {
      value: textarea.value,
      rows: textarea.rows,
      height: textarea.style.height,
      overflowY: textarea.style.overflowY,
    };

    textarea.value = "";
    textarea.style.height = "auto";
    textarea.style.overflowY = "hidden";
    textarea.rows = minRows;
    const minHeight = textarea.scrollHeight;
    textarea.rows = maxRows;
    const maxHeight = textarea.scrollHeight;

    textarea.value = saved.value;
    textarea.rows = saved.rows;
    textarea.style.height = saved.height;
    textarea.style.overflowY = saved.overflowY;

    return { minHeight, maxHeight };
  }, [minRows, maxRows]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    if (boundsRef.current === null) {
      const bounds = measureBounds();

      if (!bounds) {
        return;
      }

      boundsRef.current = bounds;
    }

    const { minHeight, maxHeight } = boundsRef.current;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const nextHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }, [measureBounds]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
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
