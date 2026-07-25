"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { MAX_WITHDRAWAL_OTHER_REASON_LENGTH } from "@/lib/bookingRequests";
import {
  applyWithdrawalReasonTextareaHeight,
  resolveWithdrawalReasonFieldValue,
} from "@/lib/booking/resolveWithdrawalReasonFieldValue";

function readInputData(event: React.FormEvent<HTMLTextAreaElement>): string | null {
  const nativeEvent = event.nativeEvent as InputEvent;

  if (nativeEvent.isComposing) {
    return null;
  }

  if (nativeEvent.inputType === "insertLineBreak") {
    return "\n";
  }

  if (
    nativeEvent.inputType === "insertText" ||
    nativeEvent.inputType === "insertReplacementText"
  ) {
    return nativeEvent.data ?? "";
  }

  return null;
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
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

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

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const pendingSelection = pendingSelectionRef.current;

    if (!textarea || !pendingSelection) {
      return;
    }

    const { start, end } = pendingSelection;
    const safeStart = Math.max(0, Math.min(start, value.length));
    const safeEnd = Math.max(safeStart, Math.min(end, value.length));

    textarea.setSelectionRange(safeStart, safeEnd);
    pendingSelectionRef.current = null;
  }, [value]);

  function commitValue(nextValue: string, selectionStart: number, selectionEnd = selectionStart) {
    pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
    onChange(nextValue);
  }

  function resolveNextValue(
    textarea: HTMLTextAreaElement,
    nextValue: string,
    allowVisibleRowTruncation: boolean,
  ): string | null {
    return resolveWithdrawalReasonFieldValue(textarea, value, nextValue, {
      allowVisibleRowTruncation,
    });
  }

  function handleBeforeInput(event: React.FormEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    const nativeEvent = event.nativeEvent as InputEvent;

    if (nativeEvent.isComposing) {
      return;
    }

    if (nativeEvent.inputType.startsWith("delete") || nativeEvent.inputType === "historyUndo") {
      return;
    }

    if (nativeEvent.inputType === "insertFromPaste") {
      event.preventDefault();
      return;
    }

    const inserted = readInputData(event);

    if (inserted === null) {
      return;
    }

    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const nextValue = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd);
    const resolved = resolveNextValue(textarea, nextValue, false);

    if (resolved === null) {
      event.preventDefault();
      pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
      return;
    }

    if (resolved !== nextValue) {
      event.preventDefault();
      const prefix = value.slice(0, selectionStart);
      const suffix = value.slice(selectionEnd);
      const cursor =
        resolved.startsWith(prefix) && resolved.endsWith(suffix)
          ? prefix.length + (resolved.length - prefix.length - suffix.length)
          : Math.min(resolved.length, selectionStart + inserted.length);
      commitValue(resolved, cursor);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();

    const textarea = event.currentTarget;
    const pastedText = event.clipboardData.getData("text/plain");
    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const nextValue = value.slice(0, selectionStart) + pastedText + value.slice(selectionEnd);
    const resolved = resolveNextValue(textarea, nextValue, true);

    if (resolved === null) {
      pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
      return;
    }

    const cursor =
      resolved.startsWith(value.slice(0, selectionStart)) &&
      resolved.endsWith(value.slice(selectionEnd))
        ? selectionStart +
          (resolved.length -
            selectionStart -
            (value.length - selectionEnd))
        : Math.min(resolved.length, selectionStart + pastedText.length);
    commitValue(resolved, cursor);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    const nextValue = event.target.value;

    if (nextValue === value) {
      return;
    }

    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const resolved = resolveNextValue(
      textarea,
      nextValue,
      isPasteLikeInsertion(nextValue.length - value.length),
    );

    if (resolved === null) {
      pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
      return;
    }

    if (resolved !== value) {
      const prefix = value.slice(0, selectionStart);
      const suffix = value.slice(selectionEnd);
      const cursor =
        resolved.startsWith(prefix) && resolved.endsWith(suffix)
          ? prefix.length + (resolved.length - prefix.length - suffix.length)
          : Math.min(resolved.length, selectionStart);
      commitValue(resolved, cursor);
      return;
    }

    pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
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
          onBeforeInput={handleBeforeInput}
          onPaste={handlePaste}
          onChange={handleChange}
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

function isPasteLikeInsertion(lengthDelta: number): boolean {
  return lengthDelta > 1;
}
