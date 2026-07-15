"use client";

import { useState } from "react";
import {
  FtcCalendarIcon,
  FtcClockIcon,
  FtcMetaRow,
  FtcRateIcon,
  FtcVenueIcon,
} from "@/app/components/ftc/FtcCompactMeta";
import { formatBookingCardEventDate } from "@/lib/bookingDateTime";
import { getDmBookingCardOfferSummary, type BookingRequest } from "@/lib/bookingRequests";

const NOTES_COLLAPSE_CHAR_THRESHOLD = 140;

function BookingCardExpandableNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = notes.trim();
  const shouldCollapse =
    trimmed.length > NOTES_COLLAPSE_CHAR_THRESHOLD || trimmed.split(/\r?\n/).length > 2;

  if (!shouldCollapse) {
    return (
      <div className="pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
          Notes
        </p>
        <p className="mt-1 break-words text-sm leading-snug text-ftc-text-secondary">
          {trimmed}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Notes
      </p>
      <p
        className={`mt-1 break-words text-sm leading-snug text-ftc-text-secondary ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {trimmed}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="mt-1 text-xs font-semibold text-ftc-primary transition hover:text-ftc-primary-dim"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

export function getBookingCardCompactRateLine(
  booking: BookingRequest,
  offerRateLabel: string,
  rateDetailLabel: string,
  pendingProposal: boolean,
): string {
  if (booking.rate_mode === "open" && pendingProposal) {
    return `${rateDetailLabel} · ${offerRateLabel}`;
  }

  return getDmBookingCardOfferSummary(booking);
}

export default function BookingCardCompactSummary({
  booking,
  rateLine,
  cancelledByLabel,
  cancellationReasonLabel,
}: {
  booking: BookingRequest;
  rateLine: string;
  cancelledByLabel?: string | null;
  cancellationReasonLabel?: string | null;
}) {
  const venue = booking.venue?.trim();
  const eventDate = booking.event_date?.trim()
    ? formatBookingCardEventDate(booking.event_date)
    : "";
  const setTime = booking.set_time?.trim() || "TBC";

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {venue ? (
          <FtcMetaRow icon={<FtcVenueIcon />}>{venue}</FtcMetaRow>
        ) : null}
        {eventDate ? (
          <FtcMetaRow icon={<FtcCalendarIcon />}>{eventDate}</FtcMetaRow>
        ) : null}
        <FtcMetaRow icon={<FtcClockIcon />}>{setTime}</FtcMetaRow>
        {rateLine ? (
          <FtcMetaRow icon={<FtcRateIcon />}>{rateLine}</FtcMetaRow>
        ) : null}
      </ul>

      {booking.notes?.trim() ? <BookingCardExpandableNotes notes={booking.notes} /> : null}

      {cancelledByLabel ? (
        <p className="break-words text-sm leading-snug text-ftc-text-secondary/70">
          <span className="text-ftc-text-muted/80">Cancelled by </span>
          {cancelledByLabel}
        </p>
      ) : null}

      {cancellationReasonLabel ? (
        <p className="break-words text-sm leading-snug text-ftc-text-secondary">
          <span className="text-ftc-text-muted">Reason </span>
          {cancellationReasonLabel}
        </p>
      ) : null}
    </div>
  );
}
