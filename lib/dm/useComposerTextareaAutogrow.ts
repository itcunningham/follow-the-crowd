"use client";

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

/** ~5 lines at 1.5rem line-height inside the composer field. */
export const COMPOSER_TEXTAREA_MAX_HEIGHT_PX = 120;

function composerNeedsMultilineHeight(value: string, scrollHeight: number, singleLineHeight: number): boolean {
  return value.includes("\n") || scrollHeight > singleLineHeight + 1;
}

export function useComposerTextareaAutogrow(
  value: string,
  externalRef?: RefObject<HTMLTextAreaElement | null>,
) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? localRef;
  const singleLineHeightRef = useRef<number | null>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    if (singleLineHeightRef.current === null) {
      const savedValue = textarea.value;
      textarea.value = "";
      textarea.style.height = "0px";
      singleLineHeightRef.current = textarea.scrollHeight;
      textarea.value = savedValue;
    }

    if (value.length === 0) {
      textarea.style.height = "";
      textarea.style.overflowY = "hidden";
      return;
    }

    textarea.style.height = "0px";
    const scrollHeight = textarea.scrollHeight;
    const singleLineHeight = singleLineHeightRef.current ?? scrollHeight;

    if (!composerNeedsMultilineHeight(value, scrollHeight, singleLineHeight)) {
      textarea.style.height = "";
      textarea.style.overflowY = "hidden";
      return;
    }

    const nextHeight = Math.min(
      Math.max(singleLineHeight, scrollHeight),
      COMPOSER_TEXTAREA_MAX_HEIGHT_PX,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      scrollHeight > COMPOSER_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [textareaRef, value]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return { textareaRef, adjustHeight };
}
