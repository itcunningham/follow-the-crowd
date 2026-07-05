"use client";

import { useEffect, useState } from "react";

const SKIP_HIDE_DECLINED_BOOKING_CONFIRM_KEY = "ftc_skip_hide_declined_booking_confirm";

function readSkipConfirmPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SKIP_HIDE_DECLINED_BOOKING_CONFIRM_KEY) === "true";
}

function saveSkipConfirmPreference(): void {
  window.localStorage.setItem(SKIP_HIDE_DECLINED_BOOKING_CONFIRM_KEY, "true");
}

function CloseIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function HideDeclinedBookingButton({
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
  const [skipConfirmEnabled, setSkipConfirmEnabled] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    setSkipConfirmEnabled(readSkipConfirmPreference());
  }, []);

  async function hideBooking(savePreference: boolean) {
    if (savePreference) {
      saveSkipConfirmPreference();
      setSkipConfirmEnabled(true);
    }

    await onConfirm();
    setOpen(false);
    setDontShowAgain(false);
  }

  function handleOpen() {
    if (skipConfirmEnabled) {
      void hideBooking(false);
      return;
    }

    setDontShowAgain(false);
    setOpen(true);
  }

  async function handleConfirm() {
    await hideBooking(dontShowAgain);
  }

  function handleCancel() {
    if (loading) {
      return;
    }

    setDontShowAgain(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Hide from lineup"
        disabled={disabled || loading}
        onClick={handleOpen}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ftc-border-strong bg-ftc-bg-elevated/60 text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <CloseIcon />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={handleCancel}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hide-declined-booking-title"
            className="w-full max-w-md rounded-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 shadow-ftc-card sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="hide-declined-booking-title" className="text-base font-semibold text-ftc-text">
              Hide declined booking?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
              This will remove it from the event lineup view, but keep the booking record in history
              and DMs.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={dontShowAgain}
                disabled={loading}
                onChange={(event) => setDontShowAgain(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ftc-border-strong bg-ftc-surface text-ftc-text0 focus:ring-2 focus:ring-ftc-primary/20"
              />
              <span className="text-sm text-ftc-text-secondary">Don&apos;t show me this again</span>
            </label>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={handleCancel}
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
                {loading ? "Hiding..." : "Hide"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
