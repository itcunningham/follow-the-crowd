"use client";

import { formatAvailabilityDateLabel } from "@/lib/djAvailability";
import BookingSheetDialog, {
  BookingSheetSecondaryButton,
  BookingSheetWarningButton,
} from "@/app/components/booking/BookingSheetDialog";

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
    <BookingSheetDialog
      open={open}
      title={isSingle ? "DJ marked unavailable" : "DJs marked unavailable"}
      titleId="unavailable-dj-booking-title"
      loading={loading}
      onBackdropClick={onBack}
      footer={
        <>
          <BookingSheetSecondaryButton disabled={loading} onClick={onBack}>
            Back
          </BookingSheetSecondaryButton>
          <BookingSheetWarningButton disabled={loading} onClick={() => void onConfirm()}>
            {loading ? "Sending..." : isSingle ? "Send anyway" : "Send requests anyway"}
          </BookingSheetWarningButton>
        </>
      }
    >
      {isSingle ? (
        <p className="text-sm leading-relaxed text-ftc-text-secondary">
          {singleDj.displayName} has marked {formattedDate} as unavailable. They may already have
          another commitment.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ftc-text-secondary">
            The following DJs marked this date unavailable:
          </p>
          <ul className="space-y-1.5 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5">
            {unavailableDjs.map((dj) => (
              <li key={dj.userId} className="text-sm text-ftc-text-secondary">
                {dj.displayName}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ftc-text-muted">
        You can still send a request if you want to discuss it.
      </p>
    </BookingSheetDialog>
  );
}
