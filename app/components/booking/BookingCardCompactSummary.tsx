"use client";

import { useState } from "react";
import { formatDisplayEventDate } from "@/lib/bookingDateTime";
import type { BookingRequest } from "@/lib/bookingRequests";

const NOTES_COLLAPSE_CHAR_THRESHOLD = 140;

function MetaIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center text-ftc-text-muted">
      {children}
    </span>
  );
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2 text-sm leading-snug">
      <MetaIcon>{icon}</MetaIcon>
      <span className="min-w-0 flex-1 break-words text-ftc-text">{children}</span>
    </li>
  );
}

function VenueIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3v18M7 8h8.5a3.5 3.5 0 0 1 0 7H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  if (booking.rate_mode === "open") {
    if (pendingProposal) {
      return `${rateDetailLabel} · ${offerRateLabel}`;
    }

    return "Ask for rate";
  }

  if (booking.status === "accepted") {
    return offerRateLabel;
  }

  return `Fixed offer · ${offerRateLabel}`;
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
    ? formatDisplayEventDate(booking.event_date)
    : "";
  const setTime = booking.set_time?.trim() || "TBC";

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {venue ? (
          <MetaRow icon={<VenueIcon />}>{venue}</MetaRow>
        ) : null}
        {eventDate ? (
          <MetaRow icon={<CalendarIcon />}>{eventDate}</MetaRow>
        ) : null}
        <MetaRow icon={<ClockIcon />}>{setTime}</MetaRow>
        {rateLine ? (
          <MetaRow icon={<RateIcon />}>{rateLine}</MetaRow>
        ) : null}
      </ul>

      {booking.notes?.trim() ? <BookingCardExpandableNotes notes={booking.notes} /> : null}

      {cancelledByLabel ? (
        <p className="break-words text-sm leading-snug text-ftc-text-secondary">
          <span className="text-ftc-text-muted">Cancelled by </span>
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
