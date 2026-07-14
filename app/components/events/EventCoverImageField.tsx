"use client";

import { useEffect, useId, useRef } from "react";
import {
  getEventCoverImageAlt,
  validateEventCoverFile,
} from "@/lib/events/eventCoverImage";
import { BOOKING_FIELD_LABEL_CLASS } from "@/lib/bookingDateTime";

export type EventCoverImageFieldState = {
  file: File | null;
  removeExisting: boolean;
};

export const emptyEventCoverImageFieldState: EventCoverImageFieldState = {
  file: null,
  removeExisting: false,
};

const EVENT_COVER_ACTION_BUTTON_CLASS =
  "ftc-btn-secondary min-h-10 px-4 py-2 text-xs font-semibold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

export default function EventCoverImageField({
  label = "Event flyer",
  eventName,
  currentCoverUrl,
  value,
  previewUrl,
  onChange,
  onPreviewUrlChange,
  onFileSelected,
  onValidationError,
  error,
  disabled = false,
}: {
  label?: string;
  eventName: string;
  currentCoverUrl: string | null;
  value: EventCoverImageFieldState;
  previewUrl: string | null;
  onChange: (next: EventCoverImageFieldState) => void;
  onPreviewUrlChange: (next: string | null) => void;
  onFileSelected?: (file: File | null) => void;
  onValidationError?: (message: string | null) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveCoverUrl =
    value.removeExisting || value.file ? null : currentCoverUrl?.trim() || null;
  const showPreview = Boolean(previewUrl || effectiveCoverUrl);
  const previewSrc = previewUrl ?? effectiveCoverUrl;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openFilePicker() {
    if (disabled) {
      return;
    }

    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateEventCoverFile(file);

    if (validationError) {
      onValidationError?.(validationError);
      onChange({ file: null, removeExisting: false });
      onFileSelected?.(null);
      onPreviewUrlChange(null);
      return;
    }

    onValidationError?.(null);

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    onChange({ file, removeExisting: false });
    onFileSelected?.(file);
    onPreviewUrlChange(URL.createObjectURL(file));
  }

  function handleRemove() {
    if (disabled) {
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    onChange({ file: null, removeExisting: true });
    onFileSelected?.(null);
    onPreviewUrlChange(null);
  }

  return (
    <div>
      <span className={BOOKING_FIELD_LABEL_CLASS}>{label}</span>
      <p className="ftc-form-field-hint">Upload event image</p>

      <div className="ftc-event-cover-panel">
        {showPreview && previewSrc ? (
          <div className="ftc-event-cover-panel-preview">
            <div className="aspect-[3/4] w-full max-w-[12.5rem] overflow-hidden rounded-[var(--ftc-radius-lg)] border border-ftc-border-subtle bg-ftc-bg-elevated">
              <img
                src={previewSrc}
                alt={getEventCoverImageAlt(eventName)}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="ftc-event-cover-panel-empty">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5 text-ftc-text-muted/70"
            >
              <rect
                x="3"
                y="4.5"
                width="14"
                height="12.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M3 8.5h14" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-ftc-text-muted">No flyer selected</p>
          </div>
        )}

        <div className="ftc-event-cover-panel-actions">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={disabled}
            className={EVENT_COVER_ACTION_BUTTON_CLASS}
          >
            {showPreview ? "Change image" : "Choose image"}
          </button>
          {showPreview ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className={EVENT_COVER_ACTION_BUTTON_CLASS}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {error ? <p className="mt-2 text-sm text-[var(--ftc-color-danger)]">{error}</p> : null}
    </div>
  );
}
