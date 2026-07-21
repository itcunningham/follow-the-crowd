"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  FtcCalendarIcon,
  FtcClockIcon,
  FtcMetaRow,
  FtcMetaTextRow,
  FtcVenueIcon,
} from "@/app/components/ftc/FtcCompactMeta";
import { formatBookingCardEventDate } from "@/lib/bookingDateTime";
import { getDmBookingCardOfferSummary, type BookingRequest } from "@/lib/bookingRequests";
import { DmBookingCardStatusMessage } from "@/app/components/booking/DmBookingCardLayout";

function BookingCardExpandableNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const trimmed = notes.trim();

  useLayoutEffect(() => {
    const el = textRef.current;

    if (!el || expanded) {
      return;
    }

    function measureOverflow() {
      const node = textRef.current;

      if (!node) {
        return;
      }

      setShowToggle(node.scrollHeight > node.clientHeight + 1);
    }

    measureOverflow();
    window.addEventListener("resize", measureOverflow);

    return () => {
      window.removeEventListener("resize", measureOverflow);
    };
  }, [trimmed, expanded]);

  if (!trimmed) {
    return null;
  }

  const canToggle = showToggle || expanded;

  return (
    <div className="pt-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Notes
      </p>
      <p
        ref={textRef}
        className={`mt-1 break-words text-sm leading-snug text-ftc-text-secondary ${
          expanded ? "block overflow-visible" : "line-clamp-3"
        }`}
      >
        {trimmed}
      </p>
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 text-xs font-semibold text-ftc-primary transition hover:text-ftc-primary-dim"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
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
  eventStatusLabel,
  cancelledByLabel,
  cancellationReasonLabel,
}: {
  booking: BookingRequest;
  rateLine: string;
  eventStatusLabel?: string | null;
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
        {rateLine ? <FtcMetaTextRow>{rateLine}</FtcMetaTextRow> : null}
      </ul>

      {booking.notes?.trim() ? <BookingCardExpandableNotes notes={booking.notes} /> : null}

      {eventStatusLabel ? (
        <DmBookingCardStatusMessage>{eventStatusLabel}</DmBookingCardStatusMessage>
      ) : null}

      {cancelledByLabel ? (
        <DmBookingCardStatusMessage label="Cancelled by">{cancelledByLabel}</DmBookingCardStatusMessage>
      ) : null}

      {cancellationReasonLabel ? (
        <DmBookingCardStatusMessage label="Reason">{cancellationReasonLabel}</DmBookingCardStatusMessage>
      ) : null}
    </div>
  );
}
