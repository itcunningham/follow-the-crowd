"use client";

import { useState } from "react";

export default function CancelBookingRequestButton({
  disabled = false,
  loading = false,
  onConfirm,
  className = "",
}: {
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
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-300/90 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading ? "Cancelling..." : "Cancel request"}
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
            aria-labelledby="cancel-booking-request-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-ftc-card sm:rounded-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cancel-booking-request-title" className="text-base font-semibold text-ftc-text">
              Cancel this booking request?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
              The DJ will no longer be able to accept it.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
              >
                Keep request
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleConfirm()}
                className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-red-300 transition hover:border-red-500/50 hover:bg-red-500/15 disabled:opacity-50"
              >
                {loading ? "Cancelling..." : "Cancel request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
