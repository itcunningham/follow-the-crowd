"use client";

import { useState } from "react";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";

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
        className={`rounded-xl border border-[var(--ftc-color-danger)] bg-ftc-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ftc-color-danger)] transition hover:border-0 hover:bg-[var(--ftc-color-danger)] hover:text-ftc-bg disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading ? "Cancelling..." : "Cancel request"}
      </button>

      <BookingSheetDialog
        open={open}
        title="Cancel this booking request?"
        titleId="cancel-booking-request-title"
        description="The DJ will no longer be able to accept it."
        loading={loading}
        onBackdropClick={() => setOpen(false)}
        footer={
          <>
            <BookingSheetSecondaryButton disabled={loading} onClick={() => setOpen(false)}>
              Keep request
            </BookingSheetSecondaryButton>
            <BookingSheetDangerButton disabled={loading} onClick={() => void handleConfirm()}>
              {loading ? "Cancelling..." : "Cancel request"}
            </BookingSheetDangerButton>
          </>
        }
      />
    </>
  );
}
