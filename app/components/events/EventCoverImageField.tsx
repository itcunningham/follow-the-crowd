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

export default function EventCoverImageField({
  label = "Cover image",
  eventName,
  currentCoverUrl,
  value,
  previewUrl,
  onChange,
  onPreviewUrlChange,
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
      onPreviewUrlChange(null);
      return;
    }

    onValidationError?.(null);

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    onChange({ file, removeExisting: false });
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
    onPreviewUrlChange(null);
  }

  return (
    <div>
      <span className={BOOKING_FIELD_LABEL_CLASS}>{label}</span>
      <p className="mb-2 text-xs text-ftc-text-muted">
        Optional landscape image. JPEG, PNG, or WebP up to 5 MB.
      </p>

      <div className="overflow-hidden rounded-xl border border-ftc-border-subtle bg-ftc-surface">
        {showPreview && previewSrc ? (
          <div className="aspect-video w-full overflow-hidden bg-ftc-bg-elevated">
            <img
              src={previewSrc}
              alt={getEventCoverImageAlt(eventName)}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-ftc-bg px-4 text-center">
            <p className="text-sm text-ftc-text-muted">No cover image selected</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-ftc-border-subtle p-3">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={disabled}
            className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-2 text-sm font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showPreview ? "Change image" : "Choose image"}
          </button>
          {showPreview ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-2 text-sm font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50"
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
