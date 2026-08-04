"use client";

import type { RefObject, TextareaHTMLAttributes } from "react";

/**
 * Floor so the empty "Message" placeholder never clips to "Mes".
 * Sized for 16px mobile type + px-4 padding inside the pill.
 * Do NOT pair with min-w-0 on this same node — that cancels the floor.
 */
export const COMPOSER_MESSAGE_FIELD_MIN_WIDTH_CLASS = "min-w-[7rem]";

type ComposerMessageFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "rows"
> & {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
};

/**
 * Shared composer textarea — wrapper reserves min width; field is always full width
 * of its flex slot so placeholder never clips to "Mes" when the row compresses
 * (common on iOS after send clears the value while the keyboard stays open).
 */
export default function ComposerMessageField({
  textareaRef,
  disabled = false,
  ...textareaProps
}: ComposerMessageFieldProps) {
  return (
    <div className={`${COMPOSER_MESSAGE_FIELD_MIN_WIDTH_CLASS} flex-1`}>
      <textarea
        ref={textareaRef}
        rows={1}
        disabled={disabled}
        {...textareaProps}
        className="ftc-input block w-full min-h-11 resize-none rounded-full px-4 py-2 leading-normal disabled:cursor-not-allowed"
      />
    </div>
  );
}
