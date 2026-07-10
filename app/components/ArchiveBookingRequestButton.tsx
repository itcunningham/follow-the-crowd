"use client";

import { useState } from "react";
import BookingSheetDialog, {
  BookingSheetPrimaryButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function ArchiveBookingRequestButton({
  disabled = false,
  loading = false,
  onConfirm,
  className = "",
  variant = "default",
  title = "Archive booking request?",
  description = "It will be moved to Archived and can be restored later.",
  confirmLabel = "Archive",
  loadingLabel = "Archiving...",
  ariaLabel = "Remove booking from history",
}: {
  disabled?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
  variant?: "default" | "icon";
  title?: string;
  description?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  ariaLabel?: string;
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
        aria-label={variant === "icon" ? ariaLabel : undefined}
        className={
          variant === "icon"
            ? `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-muted transition hover:border-[var(--ftc-color-danger)]/35 hover:text-[var(--ftc-color-danger)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`
            : `inline-flex items-center gap-1.5 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50 ${className}`
        }
      >
        <TrashIcon className={variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {variant === "icon" ? null : loading ? loadingLabel : confirmLabel}
      </button>

      <BookingSheetDialog
        open={open}
        title={title}
        titleId="archive-booking-request-title"
        description={description}
        loading={loading}
        onBackdropClick={() => setOpen(false)}
        footer={
          <>
            <BookingSheetSecondaryButton disabled={loading} onClick={() => setOpen(false)}>
              Cancel
            </BookingSheetSecondaryButton>
            <BookingSheetPrimaryButton disabled={loading} onClick={() => void handleConfirm()}>
              {loading ? loadingLabel : confirmLabel}
            </BookingSheetPrimaryButton>
          </>
        }
      />
    </>
  );
}
