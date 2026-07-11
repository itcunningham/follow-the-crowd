"use client";

import { useState } from "react";

type EventLifecycleMode = "delete" | "cancel";

const COPY: Record<
  EventLifecycleMode,
  {
    buttonLabel: string;
    confirmLabel: string;
    title: string;
    body: string;
    keepLabel: string;
    actionLabel: string;
    loadingLabel: string;
  }
> = {
  delete: {
    buttonLabel: "Delete event",
    confirmLabel: "Delete event",
    title: "Delete event?",
    body: "This will permanently remove this event.",
    keepLabel: "Keep event",
    actionLabel: "Delete event",
    loadingLabel: "Deleting...",
  },
  cancel: {
    buttonLabel: "Cancel event",
    confirmLabel: "Cancel event",
    title: "Cancel event?",
    body: "This event will be marked as cancelled. Pending booking requests will be cancelled too. Accepted, declined, messages, and history will be kept.",
    keepLabel: "Keep event",
    actionLabel: "Cancel event",
    loadingLabel: "Cancelling...",
  },
};

export default function EventDeleteCancelButton({
  mode,
  disabled = false,
  loading = false,
  onConfirm,
  className = "",
}: {
  mode: EventLifecycleMode;
  disabled?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const copy = COPY[mode];

  async function handleConfirm() {
    await onConfirm();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-[var(--ftc-color-danger)] bg-ftc-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--ftc-color-danger)] transition hover:bg-[var(--ftc-color-danger)] hover:text-ftc-bg disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading ? copy.loadingLabel : copy.buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => {
            if (!loading) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`event-${mode}-title`}
            className="ftc-modal w-full max-w-md rounded-2xl p-4 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={`event-${mode}-title`} className="text-base font-semibold text-ftc-text">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">{copy.body}</p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="ftc-btn-secondary px-4 py-2.5 text-sm uppercase tracking-wide disabled:opacity-50"
              >
                {copy.keepLabel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleConfirm()}
                className="rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? copy.loadingLabel : copy.actionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
