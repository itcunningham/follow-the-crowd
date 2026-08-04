"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { MAX_WITHDRAWAL_OTHER_REASON_LENGTH } from "@/lib/bookingRequests";
import {
  mapWithdrawalReasonCursorAfterSanitize,
  sanitizeWithdrawalOtherReasonValue,
} from "@/lib/booking/withdrawalReasonDetails";
import {
  resetWithdrawalReasonTextareaScroll,
  scrollWithdrawalReasonCaretIntoView,
} from "@/lib/booking/scrollWithdrawalReasonCaretIntoView";

export default function WithdrawalReasonDetailsField({
  value,
  onChange,
  disabled = false,
  placeholder = "Details",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    setDisplayValue(value);

    const textarea = textareaRef.current;

    if (textarea) {
      resetWithdrawalReasonTextareaScroll(textarea);
    }
  }, [value]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const pendingSelection = pendingSelectionRef.current;

    if (pendingSelection) {
      const { start, end } = pendingSelection;
      const safeStart = Math.max(0, Math.min(start, displayValue.length));
      const safeEnd = Math.max(safeStart, Math.min(end, displayValue.length));
      textarea.setSelectionRange(safeStart, safeEnd);
      pendingSelectionRef.current = null;
    }

    if (document.activeElement === textarea) {
      scrollWithdrawalReasonCaretIntoView(textarea);
    }
  }, [displayValue]);

  function syncCaretVisibility() {
    const textarea = textareaRef.current;

    if (!textarea || document.activeElement !== textarea) {
      return;
    }

    scrollWithdrawalReasonCaretIntoView(textarea);
  }

  function applySanitizedValue(rawValue: string, cursor: number) {
    const sanitized = sanitizeWithdrawalOtherReasonValue(rawValue);
    const nextCursor = mapWithdrawalReasonCursorAfterSanitize(rawValue, sanitized, cursor);

    pendingSelectionRef.current = { start: nextCursor, end: nextCursor };
    setDisplayValue(sanitized);

    if (sanitized !== rawValue) {
      forceRender();
    }

    if (sanitized !== value) {
      onChange(sanitized);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const rawValue = event.target.value;
    const cursor = event.target.selectionStart ?? rawValue.length;

    if (isComposingRef.current) {
      setDisplayValue(rawValue);
      return;
    }

    applySanitizedValue(rawValue, cursor);
  }

  function handleCompositionEnd(event: React.CompositionEvent<HTMLTextAreaElement>) {
    isComposingRef.current = false;

    const rawValue = event.currentTarget.value;
    const cursor = event.currentTarget.selectionStart ?? rawValue.length;

    applySanitizedValue(rawValue, cursor);
  }

  return (
    <label className="block [overflow-anchor:none]">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Details
      </span>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={displayValue}
          disabled={disabled}
          onChange={handleChange}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={handleCompositionEnd}
          onSelect={syncCaretVisibility}
          onKeyUp={syncCaretVisibility}
          onClick={syncCaretVisibility}
          rows={3}
          placeholder={placeholder}
          className="ftc-textarea ftc-fixed-scroll-textarea ftc-fixed-scroll-textarea-3 ftc-withdrawal-reason-textarea w-full rounded-lg text-sm"
        />
        <span className="ftc-textarea-inline-counter" aria-hidden="true">
          {displayValue.length}/{MAX_WITHDRAWAL_OTHER_REASON_LENGTH}
        </span>
      </div>
    </label>
  );
}
