"use client";

import { useState } from "react";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";

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
        className={`inline-flex items-center gap-1.5 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <ArchiveIcon />
        {loading ? "Archiving..." : "Archive"}
      </button>

      <BookingSheetDialog
        open={open}
        title="Archive booking request?"
        titleId="archive-booking-request-title"
        description="It will be moved to Archived and can be restored later."
        loading={loading}
        onBackdropClick={() => setOpen(false)}
        footer={
          <>
            <BookingSheetSecondaryButton disabled={loading} onClick={() => setOpen(false)}>
              Cancel
            </BookingSheetSecondaryButton>
            <BookingSheetPrimaryButton disabled={loading} onClick={() => void handleConfirm()}>
              {loading ? "Archiving..." : "Archive"}
            </BookingSheetPrimaryButton>
          </>
        }
      />
    </>
  );
}
