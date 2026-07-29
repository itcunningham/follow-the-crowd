"use client";

import type { RefObject, TextareaHTMLAttributes } from "react";

/** Minimum width so "Message" placeholder never truncates while focused or empty. */
export const COMPOSER_MESSAGE_FIELD_MIN_WIDTH_CLASS = "min-w-[6.5rem]";

type ComposerMessageFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "rows"
> & {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
};

/**
 * Shared composer textarea — wrapper reserves min width; field is always full width
 * of its flex slot so placeholder never clips to "Mes" when the row compresses.
 */
export default function ComposerMessageField({
  textareaRef,
  disabled = false,
  ...textareaProps
}: ComposerMessageFieldProps) {
  return (
    <div className={`${COMPOSER_MESSAGE_FIELD_MIN_WIDTH_CLASS} min-w-0 flex-1`}>
      <textarea
        ref={textareaRef}
        rows={1}
        disabled={disabled}
        {...textareaProps}
        className="ftc-input w-full min-h-11 resize-none rounded-full px-4 py-2 leading-normal disabled:cursor-not-allowed"
      />
    </div>
  );
}
