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
import { DmBookingCardCancellationReason, DmBookingCardStatusMessage } from "@/app/components/booking/DmBookingCardLayout";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function BookingCardExpandableNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [noteHeights, setNoteHeights] = useState<{ collapsed: number; full: number } | null>(
    null,
  );
  const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const trimmed = notes.trim();

  useLayoutEffect(() => {
    const element = textRef.current;

    if (!element) {
      return;
    }

    function measureHeights() {
      const node = textRef.current;

      if (!node) {
        return;
      }

      node.classList.remove("line-clamp-3");
      const fullHeight = node.scrollHeight;
      node.classList.add("line-clamp-3");
      const collapsedHeight = node.scrollHeight;
      node.classList.remove("line-clamp-3");

      setNoteHeights({ collapsed: collapsedHeight, full: fullHeight });
      setShowToggle(fullHeight > collapsedHeight + 1);
      setAnimatedHeight(
        expandedRef.current ? fullHeight : collapsedHeight,
      );
    }

    measureHeights();
    window.addEventListener("resize", measureHeights);

    return () => {
      window.removeEventListener("resize", measureHeights);
    };
  }, [trimmed]);

  if (!trimmed) {
    return null;
  }

  const canToggle = showToggle || expanded;
  const useMeasuredHeight = noteHeights != null && animatedHeight != null;

  function handleToggle() {
    if (!noteHeights) {
      setExpanded((open) => !open);
      return;
    }

    const nextExpanded = !expanded;
    const nextHeight = nextExpanded ? noteHeights.full : noteHeights.collapsed;
    const startHeight = nextExpanded ? noteHeights.collapsed : noteHeights.full;

    if (prefersReducedMotion()) {
      setExpanded(nextExpanded);
      setAnimatedHeight(nextHeight);
      return;
    }

    setAnimatedHeight(startHeight);
    requestAnimationFrame(() => {
      setAnimatedHeight(nextHeight);
      setExpanded(nextExpanded);
    });
  }

  return (
    <div className="pt-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        Notes
      </p>
      <div
        data-dm-booking-notes-expand-panel
        className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
        style={useMeasuredHeight ? { height: animatedHeight } : undefined}
      >
        <p
          ref={textRef}
          className={`mt-1 break-words text-sm leading-snug text-ftc-text-secondary ${
            useMeasuredHeight ? "block" : expanded ? "block overflow-visible" : "line-clamp-3"
          }`}
        >
          {trimmed}
        </p>
      </div>
      {canToggle ? (
        <button
          type="button"
          onClick={handleToggle}
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
    <div className="min-w-0 space-y-3">
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
        <DmBookingCardCancellationReason>{cancellationReasonLabel}</DmBookingCardCancellationReason>
      ) : null}
    </div>
  );
}
