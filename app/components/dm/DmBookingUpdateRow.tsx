"use client";

import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import {
  formatBookingStatusLabel,
  getBookingCancelledDmBadgeClass,
  getBookingCancelledDmCardClass,
  getEventCancelledBookingLabel,
  isBookingAffectedByCancelledEvent,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";

export default function DmBookingUpdateRow({
  booking,
  currentUserId,
  eventCancelled = false,
  onViewDetails,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  eventCancelled?: boolean;
  onViewDetails: () => void;
}) {
  const isExplicitCancelled = booking.status === "cancelled";
  const showAsCancelled =
    isExplicitCancelled || isBookingAffectedByCancelledEvent(booking, eventCancelled);
  const displayStatus: BookingRequestStatus = showAsCancelled
    ? "cancelled"
    : booking.status;
  const title = booking.event_name.trim() || "Booking request";
  const eventCancelledLabel = isBookingAffectedByCancelledEvent(booking, eventCancelled)
    ? getEventCancelledBookingLabel(booking, currentUserId)
    : null;
  const statusLabel = isExplicitCancelled
    ? "Cancelled"
    : eventCancelledLabel ?? "Cancelled";
  const cardClass = showAsCancelled
    ? getBookingCancelledDmCardClass()
    : "border border-ftc-border-subtle bg-ftc-surface";
  const badgeOverrideClass = showAsCancelled ? getBookingCancelledDmBadgeClass() : null;
  const statusText = badgeOverrideClass
    ? statusLabel
    : formatBookingStatusLabel(displayStatus);

  return (
    <button
      type="button"
      onClick={onViewDetails}
      aria-expanded={false}
      aria-label={`${title}, ${statusText}. View booking details`}
      className={`w-full max-w-sm min-h-[44px] rounded-xl p-2.5 text-left transition hover:border-ftc-border-strong active:border-ftc-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary ${cardClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ftc-text">{title}</p>
        {badgeOverrideClass ? (
          <span className={badgeOverrideClass}>{statusLabel}</span>
        ) : (
          <BookingStatusBadge status={displayStatus} />
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-ftc-border-subtle/80 pt-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ftc-text-secondary">
          View details
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 text-ftc-text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}
