"use client";

import type { RefObject, TextareaHTMLAttributes } from "react";

/**
 * Composer action row: photo | field | send.
 * CSS grid (not flex) so the middle track cannot collapse on iOS after send
 * clears the draft — flex + empty textarea is a known WebKit shrink bug.
 */
export const COMPOSER_ACTION_ROW_CLASS =
  "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2";

type ComposerMessageFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "rows" | "placeholder"
> & {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  /** Visible empty-state label. Rendered as an overlay — not the native
   * placeholder — because iOS Safari truncates native placeholders after clear. */
  placeholder?: string;
};

/**
 * Shared composer textarea. Fills the grid middle track; empty label is an
 * overlay so "Message" never clips to "M" / "Mes" after send.
 */
export default function ComposerMessageField({
  textareaRef,
  disabled = false,
  placeholder = "Message",
  value,
  ...textareaProps
}: ComposerMessageFieldProps) {
  const showEmptyLabel = String(value ?? "").length === 0;

  return (
    <div className="ftc-chat-composer-field relative min-w-0 w-full">
      {showEmptyLabel ? (
        <span
          aria-hidden="true"
          data-testid="composer-empty-label"
          className="pointer-events-none absolute inset-y-0 left-4 right-4 z-10 flex items-center truncate text-base leading-normal text-ftc-text-muted"
        >
          {placeholder}
        </span>
      ) : null}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        {...textareaProps}
        disabled={disabled}
        // Native placeholder left empty on purpose — iOS clips it after send.
        placeholder=""
        aria-label={placeholder}
        data-testid="composer-message-input"
        className="ftc-input relative z-0 block w-full min-h-11 resize-none rounded-full px-4 py-2 leading-normal disabled:cursor-not-allowed"
      />
    </div>
  );
}
