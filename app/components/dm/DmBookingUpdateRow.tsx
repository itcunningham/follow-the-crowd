"use client";

import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import {
  DM_BOOKING_CARD_SHELL_CLASS,
  DmBookingCardCollapsedDetails,
  DmBookingCardCollapsedHeader,
  DmBookingCardExpandFooter,
} from "@/app/components/booking/DmBookingCardLayout";
import {
  formatBookingStatusLabel,
  getBookingCollapsedOfferSummary,
  getEventCancelledBookingLabel,
  isBookingAffectedByCancelledEvent,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { formatBookingCardEventDate } from "@/lib/bookingDateTime";
import type { BookingFocusPhase } from "@/lib/chatBookingFocusHighlight";

export default function DmBookingUpdateRow({
  booking,
  currentUserId,
  eventCancelled = false,
  highlightClassName = "",
  bookingFocusPhase = null,
  onViewDetails,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  eventCancelled?: boolean;
  highlightClassName?: string;
  bookingFocusPhase?: BookingFocusPhase;
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
  const statusText = formatBookingStatusLabel(displayStatus);
  const collapsedOfferSummary = getBookingCollapsedOfferSummary(booking);
  const collapsedDateVenue = [
    booking.event_date?.trim() ? formatBookingCardEventDate(booking.event_date) : "",
    booking.venue?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  const collapsedStatusMessage = eventCancelledLabel ?? null;

  return (
    <button
      type="button"
      onClick={onViewDetails}
      aria-expanded={false}
      aria-label={`${title}, ${statusText}. View booking details`}
      className={`relative z-10 ${DM_BOOKING_CARD_SHELL_CLASS} min-h-[44px] touch-manipulation text-left transition hover:border-ftc-border-strong active:border-ftc-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary ${highlightClassName}`}
    >
      <DmBookingCardCollapsedHeader
        title={title}
        badge={<BookingStatusBadge status={displayStatus} />}
      />

      <DmBookingCardCollapsedDetails
        offerSummary={collapsedOfferSummary}
        dateVenue={collapsedDateVenue || null}
        statusMessage={collapsedStatusMessage}
      />

      <DmBookingCardExpandFooter label="View details" />

      {bookingFocusPhase ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-10 box-border rounded-2xl border-2 border-[var(--ftc-color-primary)] transition-opacity duration-1000 ease-out ${
            bookingFocusPhase === "active" ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </button>
  );
}
