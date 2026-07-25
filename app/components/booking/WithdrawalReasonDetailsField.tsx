"use client";

import { useLayoutEffect, useRef } from "react";
import { MAX_WITHDRAWAL_OTHER_REASON_LENGTH } from "@/lib/bookingRequests";
import { sanitizeWithdrawalOtherReasonInput } from "@/lib/booking/withdrawalReasonDetails";

function readBeforeInputInsertion(event: React.FormEvent<HTMLTextAreaElement>): string | null {
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

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const pendingSelection = pendingSelectionRef.current;

    if (!textarea) {
      return;
    }

    if (pendingSelection) {
      const { start, end } = pendingSelection;
      const safeStart = Math.max(0, Math.min(start, value.length));
      const safeEnd = Math.max(safeStart, Math.min(end, value.length));
      textarea.setSelectionRange(safeStart, safeEnd);
      pendingSelectionRef.current = null;
      return;
    }

    if (document.activeElement !== textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    textarea.setSelectionRange(selectionStart, selectionEnd);
  }, [value]);

  function commitValue(nextValue: string, selectionStart: number, selectionEnd = selectionStart) {
    pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
    onChange(nextValue);
  }

  function sanitizeEdit(
    nextValue: string,
    allowLineTruncation: boolean,
  ): string | null {
    return sanitizeWithdrawalOtherReasonInput(value, nextValue, {
      allowLineTruncation,
    });
  }

  function handleBeforeInput(event: React.FormEvent<HTMLTextAreaElement>) {
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

    const inserted = readBeforeInputInsertion(event);

    if (inserted === null) {
      return;
    }

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const nextValue = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd);
    const limited = sanitizeEdit(nextValue, false);

    if (limited === null) {
      event.preventDefault();
      pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
      return;
    }

    if (limited !== nextValue) {
      event.preventDefault();
      const cursor =
        limited.startsWith(value.slice(0, selectionStart)) &&
        limited.endsWith(value.slice(selectionEnd))
          ? selectionStart +
            (limited.length - selectionStart - (value.length - selectionEnd))
          : Math.min(limited.length, selectionStart + inserted.length);
      commitValue(limited, cursor);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();

    const textarea = event.currentTarget;
    const pastedText = event.clipboardData.getData("text/plain");
    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const nextValue = value.slice(0, selectionStart) + pastedText + value.slice(selectionEnd);
    const limited = sanitizeEdit(nextValue, true);

    if (limited === null) {
      pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
      return;
    }

    const cursor =
      limited.startsWith(value.slice(0, selectionStart)) &&
      limited.endsWith(value.slice(selectionEnd))
        ? selectionStart +
          (limited.length - selectionStart - (value.length - selectionEnd))
        : limited.length;
    commitValue(limited, cursor);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    const nextValue = event.target.value;

    if (nextValue === value) {
      return;
    }

    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const allowLineTruncation = nextValue.length - value.length > 1;
    const limited = sanitizeEdit(nextValue, allowLineTruncation);

    if (limited === null) {
      pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
      return;
    }

    if (limited !== value) {
      const cursor =
        limited.startsWith(value.slice(0, selectionStart)) &&
        limited.endsWith(value.slice(selectionEnd))
          ? selectionStart +
            (limited.length - selectionStart - (value.length - selectionEnd))
          : Math.min(limited.length, selectionStart);
      commitValue(limited, cursor);
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
