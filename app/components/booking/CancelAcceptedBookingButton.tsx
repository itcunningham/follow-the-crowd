"use client";

import { useMemo, useState } from "react";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import {
  DJ_WITHDRAWAL_REASONS,
  PLANNER_CANCELLATION_REASONS,
  type AcceptedBookingCancellationRole,
} from "@/lib/bookingRequests";

function buildResolvedReason(selectedReason: string, otherReason: string): string | null {
  const trimmedSelected = selectedReason.trim();

  if (!trimmedSelected) {
    return null;
  }

  if (trimmedSelected === "Other") {
    return otherReason.trim() || null;
  }

  return trimmedSelected;
}

export default function CancelAcceptedBookingButton({
  role,
  disabled = false,
  loading = false,
  onConfirm,
  className = "",
}: {
  role: AcceptedBookingCancellationRole;
  disabled?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const reasonOptions =
    role === "planner" ? PLANNER_CANCELLATION_REASONS : DJ_WITHDRAWAL_REASONS;
  const triggerLabel = role === "planner" ? "Cancel booking" : "Withdraw from event";
  const title = role === "planner" ? "Cancel booking?" : "Withdraw from event?";
  const description =
    role === "planner"
      ? "This DJ will be removed from the event run sheet and notified in the group chat."
      : "You will be removed from the event run sheet and the planner will be notified in the group chat.";
  const confirmLabel = role === "planner" ? "Cancel booking" : "Withdraw";

  const resolvedReason = useMemo(
    () => buildResolvedReason(selectedReason, otherReason),
    [otherReason, selectedReason],
  );

  const canConfirm = Boolean(resolvedReason);

  function resetForm() {
    setSelectedReason("");
    setOtherReason("");
  }

  function handleClose() {
    if (loading) {
      return;
    }

    setOpen(false);
    resetForm();
  }

  async function handleConfirm() {
    if (!resolvedReason) {
      return;
    }

    await onConfirm(resolvedReason);
    setOpen(false);
    resetForm();
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className={`rounded-xl border border-[var(--ftc-color-danger)] bg-ftc-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ftc-color-danger)] transition hover:border-0 hover:bg-[var(--ftc-color-danger)] hover:text-ftc-bg disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {loading ? `${confirmLabel}...` : triggerLabel}
      </button>

      <BookingSheetDialog
        open={open}
        title={title}
        titleId="cancel-accepted-booking-title"
        description={description}
        loading={loading}
        onBackdropClick={handleClose}
        footer={
          <>
            <BookingSheetSecondaryButton disabled={loading} onClick={handleClose}>
              Go back
            </BookingSheetSecondaryButton>
            <BookingSheetDangerButton
              disabled={loading || !canConfirm}
              onClick={() => void handleConfirm()}
            >
              {loading ? `${confirmLabel}...` : confirmLabel}
            </BookingSheetDangerButton>
          </>
        }
      >
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
            Reason
          </legend>
          <div className="flex flex-wrap gap-2">
            {reasonOptions.map((option) => {
              const isSelected = selectedReason === option;

              return (
                <button
                  key={option}
                  type="button"
                  disabled={loading}
                  onClick={() => setSelectedReason(option)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "border-ftc-primary bg-ftc-primary/15 text-ftc-text"
                      : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {selectedReason === "Other" ? (
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Details
              </span>
              <textarea
                value={otherReason}
                disabled={loading}
                onChange={(event) => setOtherReason(event.target.value)}
                rows={2}
                placeholder="Add a short reason"
                className="ftc-textarea w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>
          ) : null}
        </fieldset>
      </BookingSheetDialog>
    </>
  );
}
