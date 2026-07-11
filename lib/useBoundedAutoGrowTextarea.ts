"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export const DEFAULT_TEXTAREA_MIN_ROWS = 4;
export const DEFAULT_TEXTAREA_MAX_ROWS = 8;

export function applyBoundedTextareaHeight(textarea: HTMLTextAreaElement): void {
  const computed = window.getComputedStyle(textarea);
  const minHeight = parseFloat(computed.minHeight);
  const maxHeight = parseFloat(computed.maxHeight);

  if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
    return;
  }

  textarea.style.removeProperty("min-height");
  textarea.style.removeProperty("max-height");

  textarea.style.height = "auto";
  const scrollHeight = textarea.scrollHeight;
  const resolvedMinHeight = Number.isFinite(minHeight) && minHeight > 0 ? minHeight : 0;
  const nextHeight = Math.min(Math.max(scrollHeight, resolvedMinHeight), maxHeight);

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
