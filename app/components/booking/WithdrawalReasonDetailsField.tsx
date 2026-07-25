"use client";

import { useLayoutEffect, useRef } from "react";
import { MAX_WITHDRAWAL_OTHER_REASON_LENGTH } from "@/lib/bookingRequests";
import {
  countWithdrawalOtherReasonLines,
  MAX_WITHDRAWAL_OTHER_REASON_LINES,
  sanitizeWithdrawalOtherReasonInput,
} from "@/lib/booking/withdrawalReasonDetails";

export default function WithdrawalReasonDetailsField({
  value,
  onChange,
  disabled = false,
  placeholder = "Add a short reason",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea || document.activeElement !== textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    textarea.setSelectionRange(selectionStart, selectionEnd);
  }, [value]);

  function handleChange(next: string) {
    const limited = sanitizeWithdrawalOtherReasonInput(value, next);

    if (limited === null) {
      return;
    }

    onChange(limited);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const nextValue = value.slice(0, selectionStart) + "\n" + value.slice(selectionEnd);

    if (countWithdrawalOtherReasonLines(nextValue) > MAX_WITHDRAWAL_OTHER_REASON_LINES) {
      event.preventDefault();
    }
  }

  return (
    <label className="block [overflow-anchor:none]">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Details
      </span>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={MAX_WITHDRAWAL_OTHER_REASON_LENGTH}
          placeholder={placeholder}
          className="ftc-textarea ftc-withdrawal-reason-textarea w-full rounded-lg px-3 py-2 text-sm"
        />
        <span className="ftc-textarea-inline-counter" aria-hidden="true">
          {value.length}/{MAX_WITHDRAWAL_OTHER_REASON_LENGTH}
        </span>
      </div>
    </label>
  );
}
