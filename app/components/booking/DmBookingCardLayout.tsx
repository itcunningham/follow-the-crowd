"use client";

import type { ReactNode } from "react";

export const DM_BOOKING_CARD_MAX_WIDTH_CLASS = "max-w-xs";

export const DM_BOOKING_CARD_SHELL_CLASS = `w-full min-w-0 ${DM_BOOKING_CARD_MAX_WIDTH_CLASS} overflow-x-hidden [overflow-anchor:none] rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-3.5`;

export const DM_BOOKING_CARD_ACTIONS_CLASS = "mt-4 flex flex-col gap-2";

export const DM_BOOKING_CARD_PAIRED_ACTIONS_ROW_CLASS = "mt-4 flex w-full gap-1.5";

/** Shared sizing for side-by-side booking card actions (View event + Cancel). */
export const DM_BOOKING_CARD_PAIRED_BUTTON_BASE_CLASS =
  "inline-flex min-h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold uppercase tracking-wide transition";

export const DM_BOOKING_CARD_PAIRED_VIEW_EVENT_CLASS =
  `${DM_BOOKING_CARD_PAIRED_BUTTON_BASE_CLASS} border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong`;

export const DM_BOOKING_CARD_PAIRED_CANCEL_CLASS = "min-w-0 flex-1";

export const DM_BOOKING_CARD_STATUS_MESSAGE_CLASS =
  "min-w-0 max-w-full break-words text-xs leading-snug text-ftc-text-secondary/70 [overflow-wrap:anywhere]";

export function DmBookingCardStatusMessage({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <p className={DM_BOOKING_CARD_STATUS_MESSAGE_CLASS}>
      {label ? <span className="text-ftc-text-muted/80">{label}</span> : null}
      {label ? " " : null}
      {children}
    </p>
  );
}

export function DmBookingCardCancellationReason({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden">
      <span className="text-xs leading-snug text-ftc-text-muted/80">Reason</span>
      <p className="ftc-dm-booking-cancellation-reason-text mt-0.5 text-xs leading-snug text-ftc-text-secondary/70">
        {children}
      </p>
    </div>
  );
}

export function DmBookingCardCollapsedHeader({
  title,
  badge,
}: {
  title: string;
  badge: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
          Booking request
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-ftc-text">
          {title}
        </p>
      </div>
      {badge}
    </div>
  );
}

export function DmBookingCardCollapsedDetails({
  offerSummary,
  dateVenue,
  statusMessage,
}: {
  offerSummary: string;
  dateVenue: string | null;
  statusMessage?: string | null;
}) {
  return (
    <>
      <p className="mt-2 break-words text-xs text-ftc-text-secondary">{offerSummary}</p>
      {dateVenue ? (
        <p className="mt-1 break-words text-xs text-ftc-text-muted">{dateVenue}</p>
      ) : null}
      {statusMessage ? (
        <p className={`mt-1 ${DM_BOOKING_CARD_STATUS_MESSAGE_CLASS}`}>{statusMessage}</p>
      ) : null}
    </>
  );
}

export function DmBookingCardExpandFooter({
  label,
  embedded = false,
}: {
  label: "View details" | "Hide details";
  embedded?: boolean;
}) {
  const chevronDown = label === "View details";

  return (
    <div
      className={`flex items-center justify-between gap-2 ${
        embedded ? "" : "mt-3 border-t border-ftc-border-subtle pt-2"
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
        {label}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-ftc-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        {chevronDown ? (
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
}

export const DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS =
  "flex w-full items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong";

/** Column wrapper for a booking card + its timestamp in DM messages. */
export const DM_BOOKING_MESSAGE_COLUMN_CLASS = "flex min-w-0 flex-col";

/** Timestamp spacing below booking card — sits in metadata indent row beneath avatar-aligned card. */
export const DM_BOOKING_MESSAGE_TIMESTAMP_CLASS =
  "mt-0.5 block text-[10px] leading-none text-ftc-text-muted";
