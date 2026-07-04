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
            className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cancel-booking-request-title" className="text-base font-semibold text-zinc-50">
              Cancel this booking request?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The DJ will no longer be able to accept it.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-zinc-600 disabled:opacity-50"
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
