"use client";

import { useState } from "react";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";

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
        className={`rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading ? "Archiving..." : "Archive all"}
      </button>

      <BookingSheetDialog
        open={open}
        title="Archive all cancelled requests?"
        titleId="archive-all-booking-requests-title"
        description="This will move all cancelled requests from History to Archived. You can restore them later"
        loading={loading}
        onBackdropClick={() => setOpen(false)}
        footer={
          <>
            <BookingSheetSecondaryButton disabled={loading} onClick={() => setOpen(false)}>
              Cancel
            </BookingSheetSecondaryButton>
            <BookingSheetPrimaryButton disabled={loading} onClick={() => void handleConfirm()}>
              {loading ? "Archiving..." : "Archive all"}
            </BookingSheetPrimaryButton>
          </>
        }
      />
    </>
  );
}
