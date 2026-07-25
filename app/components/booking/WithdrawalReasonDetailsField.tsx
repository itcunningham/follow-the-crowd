"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { MAX_WITHDRAWAL_OTHER_REASON_LENGTH } from "@/lib/bookingRequests";
import { applyTextInputLimit } from "@/lib/textInputLimits";

function applyWithdrawalReasonTextareaHeight(textarea: HTMLTextAreaElement): void {
  const style = window.getComputedStyle(textarea);
  const minHeight = parseFloat(style.minHeight);
  const maxHeight = parseFloat(style.maxHeight);

  if (!Number.isFinite(minHeight) || !Number.isFinite(maxHeight) || maxHeight <= 0) {
    return;
  }

  textarea.style.overflowY = "hidden";
  textarea.style.height = `${minHeight}px`;
  const contentHeight = textarea.scrollHeight;
  const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
}

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

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    applyWithdrawalReasonTextareaHeight(textarea);
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

  function handleChange(next: string) {
    const limited = applyTextInputLimit(value, next, MAX_WITHDRAWAL_OTHER_REASON_LENGTH);

    if (limited === null) {
      return;
    }

    onChange(limited);
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
          rows={2}
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
