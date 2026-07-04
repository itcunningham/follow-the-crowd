"use client";

import { useState } from "react";

function ArchiveIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h18" />
      <path d="M5 7l1 12h12l1-12" />
      <path d="M9 7V5h6v2" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export default function ArchiveBookingRequestButton({
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
        className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <ArchiveIcon />
        {loading ? "Archiving..." : "Archive"}
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
            aria-labelledby="archive-booking-request-title"
            className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.55)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="archive-booking-request-title" className="text-base font-semibold text-zinc-50">
              Archive booking request?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              It will be moved to Archived and can be restored later.
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
                {loading ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
