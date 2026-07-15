"use client";

import type { ReactNode } from "react";

export const DM_BOOKING_CARD_MAX_WIDTH_CLASS = "max-w-xs";

export const DM_BOOKING_CARD_SHELL_CLASS = `w-full ${DM_BOOKING_CARD_MAX_WIDTH_CLASS} rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-3.5`;

export const DM_BOOKING_CARD_ACTIONS_CLASS = "mt-4 flex flex-col gap-2";

export const DM_BOOKING_CARD_STATUS_MESSAGE_CLASS =
  "break-words text-xs leading-snug text-ftc-text-secondary/70";

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
