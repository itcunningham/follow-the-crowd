"use client";

import { useState } from "react";

export default function ArchiveAllBookingRequestsButton({
  count,
  disabled = false,
  loading = false,
  onConfirm,
  className = "",
}: {
  count: number;
  disabled?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    await onConfirm();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading || count === 0}
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-ftc-border-strong bg-ftc-bg-elevated/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading ? "Archiving..." : "Archive all"}
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
            aria-labelledby="archive-all-booking-requests-title"
            className="w-full max-w-md rounded-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 shadow-ftc-card sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="archive-all-booking-requests-title" className="text-base font-semibold text-ftc-text">
              Archive all cancelled requests?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
              This will move all cancelled requests from History to Archived. You can restore them
              later.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleConfirm()}
                className="rounded-xl border border-ftc-border-strong bg-ftc-surface-raised/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text transition hover:border-ftc-border-strong hover:bg-ftc-surface-raised disabled:opacity-50"
              >
                {loading ? "Archiving..." : "Archive all"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
