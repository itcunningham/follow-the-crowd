"use client";

import { useEffect, useState } from "react";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";

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
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <CloseIcon />
      </button>

      <BookingSheetDialog
        open={open}
        title="Hide declined booking?"
        titleId="hide-declined-booking-title"
        description="This will remove it from the event lineup view, but keep the booking record in history and DMs."
        loading={loading}
        onBackdropClick={handleCancel}
        footer={
          <>
            <BookingSheetSecondaryButton disabled={loading} onClick={handleCancel}>
              Cancel
            </BookingSheetSecondaryButton>
            <BookingSheetPrimaryButton disabled={loading} onClick={() => void handleConfirm()}>
              {loading ? "Hiding..." : "Hide"}
            </BookingSheetPrimaryButton>
          </>
        }
      >
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={dontShowAgain}
            disabled={loading}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ftc-border-subtle bg-ftc-bg-input text-ftc-primary focus:border-ftc-primary-border"
          />
          <span className="text-sm text-ftc-text-secondary">Don&apos;t show me this again</span>
        </label>
      </BookingSheetDialog>
    </>
  );
}

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
