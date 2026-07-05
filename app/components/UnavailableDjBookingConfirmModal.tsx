"use client";

import { formatAvailabilityDateLabel } from "@/lib/djAvailability";

export default function UnavailableDjBookingConfirmModal({
  open,
  loading = false,
  eventDate,
  unavailableDjs,
  onBack,
  onConfirm,
}: {
  open: boolean;
  loading?: boolean;
  eventDate: string;
  unavailableDjs: ReadonlyArray<{ userId: string; displayName: string }>;
  onBack: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open || unavailableDjs.length === 0) {
    return null;
  }

  const formattedDate = formatAvailabilityDateLabel(eventDate);
  const isSingle = unavailableDjs.length === 1;
  const singleDj = unavailableDjs[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={() => {
        if (!loading) {
          onBack();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unavailable-dj-booking-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-ftc-card sm:rounded-2xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="unavailable-dj-booking-title" className="text-base font-semibold text-ftc-text">
          {isSingle ? "DJ marked unavailable" : "DJs marked unavailable"}
        </h2>

        {isSingle ? (
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
            {singleDj.displayName} has marked {formattedDate} as unavailable. They may already have
            another commitment.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-sm leading-relaxed text-ftc-text-secondary">
              The following DJs marked this date unavailable:
            </p>
            <ul className="space-y-1.5 rounded-xl border border-ftc-border bg-ftc-surface/40 px-3 py-2.5">
              {unavailableDjs.map((dj) => (
                <li key={dj.userId} className="text-sm text-ftc-text">
                  {dj.displayName}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-ftc-text-muted">
          You can still send a request if you want to discuss it.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onBack}
            className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-amber-200 transition hover:border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-50"
          >
            {loading ? "Sending..." : isSingle ? "Send anyway" : "Send requests anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}
