"use client";

import {
  FtcCalendarIcon,
  FtcClockIcon,
  FtcMetaRow,
  FtcVenueIcon,
} from "@/app/components/ftc/FtcCompactMeta";
import BookingCardExpandableNotes from "@/app/components/booking/BookingCardExpandableNotes";
import { formatBookingCardEventDate } from "@/lib/bookingDateTime";
import { getDmBookingCardOfferSummary, type BookingRequest } from "@/lib/bookingRequests";
import { DmBookingCardCancellationReason, DmBookingCardStatusMessage } from "@/app/components/booking/DmBookingCardLayout";

export function getBookingCardCompactRateLine(
  booking: BookingRequest,
  _offerRateLabel: string,
  _rateDetailLabel: string,
  _pendingProposal: boolean,
): string {
  return getDmBookingCardOfferSummary(booking);
}

export default function BookingCardCompactSummary({
  booking,
  rateLine,
  eventStatusLabel,
  cancelledByLabel,
  cancellationReasonLabel,
  detailsOpen = true,
  onNotesExpandedChange,
}: {
  booking: BookingRequest;
  rateLine: string;
  eventStatusLabel?: string | null;
  cancelledByLabel?: string | null;
  cancellationReasonLabel?: string | null;
  detailsOpen?: boolean;
  onNotesExpandedChange?: (expanded: boolean) => void;
}) {
  const venue = booking.venue?.trim();
  const eventDate = booking.event_date?.trim()
    ? formatBookingCardEventDate(booking.event_date)
    : "";
  const setTime = booking.set_time?.trim() || "TBC";

  return (
    <div className="min-w-0 space-y-3">
      <ul className="space-y-2.5">
        {venue ? (
          <FtcMetaRow icon={<FtcVenueIcon />}>{venue}</FtcMetaRow>
        ) : null}
        {eventDate ? (
          <FtcMetaRow icon={<FtcCalendarIcon />}>{eventDate}</FtcMetaRow>
        ) : null}
        <FtcMetaRow icon={<FtcClockIcon />}>{setTime}</FtcMetaRow>
      </ul>

      {rateLine ? (
        <p className="break-words text-sm leading-snug text-ftc-text-secondary">{rateLine}</p>
      ) : null}

      {booking.notes?.trim() ? (
        <BookingCardExpandableNotes
          notes={booking.notes}
          detailsOpen={detailsOpen}
          onNotesExpandedChange={onNotesExpandedChange}
        />
      ) : null}

      {eventStatusLabel ? (
        <DmBookingCardStatusMessage>{eventStatusLabel}</DmBookingCardStatusMessage>
      ) : null}

      {cancelledByLabel ? (
        <DmBookingCardStatusMessage label="Cancelled by">{cancelledByLabel}</DmBookingCardStatusMessage>
      ) : null}

      {cancellationReasonLabel ? (
        <DmBookingCardCancellationReason>{cancellationReasonLabel}</DmBookingCardCancellationReason>
      ) : null}
    </div>
  );
}
