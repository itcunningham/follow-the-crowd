"use client";

import type { CompositionEvent, KeyboardEvent } from "react";

export default function BookingFormField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
  textareaClassName = "",
  textareaRows = 3,
  textareaOnKeyDown,
  textareaOnCompositionStart,
  textareaOnCompositionEnd,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  textareaClassName?: string;
  textareaRows?: number;
  textareaOnKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaOnCompositionStart?: () => void;
  textareaOnCompositionEnd?: (event: CompositionEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="block">
      <span className="ftc-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={textareaOnKeyDown}
          onCompositionStart={textareaOnCompositionStart}
          onCompositionEnd={textareaOnCompositionEnd}
          placeholder={placeholder}
          rows={textareaRows}
          className={`ftc-input px-3.5 py-2.5 ${textareaClassName}`.trim()}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="ftc-input px-3.5 py-2.5"
        />
      )}
    </label>
  );
}
