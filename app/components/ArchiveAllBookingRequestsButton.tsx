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
        className={`rounded-lg border border-zinc-700/80 bg-zinc-950/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
            className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="archive-all-booking-requests-title" className="text-base font-semibold text-zinc-50">
              Archive all cancelled requests?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              This will move all cancelled requests from History to Archived. You can restore them
              later.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-zinc-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleConfirm()}
                className="rounded-xl border border-zinc-600/50 bg-zinc-800/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
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
