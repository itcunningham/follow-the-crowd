"use client";

import {
  measureWithdrawalReasonContentHeight,
  truncateWithdrawalReasonToVisibleRows,
  withdrawalReasonFitsVisibleRows,
} from "@/lib/booking/measureWithdrawalReasonVisibleRows";
import { sanitizeWithdrawalOtherReasonInput } from "@/lib/booking/withdrawalReasonDetails";

function isPasteLikeInsertion(currentValue: string, nextValue: string): boolean {
  return nextValue.length - currentValue.length > 1;
}

export function resolveWithdrawalReasonFieldValue(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  nextValue: string,
  options?: { allowVisibleRowTruncation?: boolean },
): string | null {
  const limited = sanitizeWithdrawalOtherReasonInput(currentValue, nextValue);

  if (limited === null) {
    return null;
  }

  if (limited.length < currentValue.length) {
    return limited;
  }

  if (withdrawalReasonFitsVisibleRows(textarea, limited)) {
    return limited;
  }

  const allowTruncation =
    options?.allowVisibleRowTruncation ?? isPasteLikeInsertion(currentValue, nextValue);

  if (allowTruncation) {
    return truncateWithdrawalReasonToVisibleRows(textarea, limited);
  }

  return null;
}

export function applyWithdrawalReasonTextareaHeight(textarea: HTMLTextAreaElement): void {
  const style = window.getComputedStyle(textarea);
  const minHeight = parseFloat(style.minHeight);
  const maxHeight = parseFloat(style.maxHeight);

  if (!Number.isFinite(minHeight) || !Number.isFinite(maxHeight) || maxHeight <= 0) {
    return;
  }

  textarea.style.overflowY = "hidden";
  textarea.style.height = `${minHeight}px`;

  const contentHeight = Math.min(textarea.scrollHeight, maxHeight);
  const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = "hidden";
}

export { measureWithdrawalReasonContentHeight, withdrawalReasonFitsVisibleRows };
