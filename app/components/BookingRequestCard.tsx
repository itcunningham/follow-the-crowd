"use client";

import Link from "next/link";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import {
  canCancelBookingRequest,
  formatBookingRequestMessage,
  getBookingGroupChatAccess,
  getBookingStatusBadgeClass,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { formatRateDisplay } from "@/lib/bookingRate";

function StatusBadge({ status }: { status: BookingRequestStatus }) {
  const label =
    status === "accepted"
      ? "Accepted"
      : status === "declined"
        ? "Declined"
        : status === "cancelled"
          ? "Cancelled"
          : "Pending";

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getBookingStatusBadgeClass(status)}`}
    >
      {label}
    </span>
  );
}

export default function BookingRequestCard({
  booking,
  currentUserId,
  canRespond,
  responding,
  cancelling,
  onAccept,
  onDecline,
  onCancel,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  canRespond: boolean;
  responding: boolean;
  cancelling?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel?: () => void | Promise<void>;
}) {
  const groupChatAccess = getBookingGroupChatAccess(booking, currentUserId);
  const showCancel = canCancelBookingRequest(booking, currentUserId) && onCancel;

  if (booking.status?.toLowerCase() === "cancelled") {
    return null;
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-ftc-primary/40 bg-ftc-primary/10 p-4 shadow-ftc-glow">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ftc-primary">
            Booking request
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-ftc-text">
            {booking.event_name}
          </h3>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <BookingDetail label="Venue" value={booking.venue} />
        <BookingDetail label="Date" value={booking.event_date} />
        <BookingDetail label="Set time" value={booking.set_time} />
        <BookingDetail label="Rate" value={formatRateDisplay(booking.fee)} />
        {booking.notes ? <BookingDetail label="Notes" value={booking.notes} /> : null}
      </dl>

      {booking.event_id ? (
        <>
          <Link
            href={`/events/${booking.event_id}`}
            className="mt-4 inline-flex rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
          >
            View event
          </Link>

          {groupChatAccess && groupChatAccess.kind !== "hidden" ? (
            <div className="mt-4 rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Event Group Chat
              </p>
              {groupChatAccess.kind === "open" ? (
                <Link
                  href={groupChatAccess.href}
                  className="mt-2 inline-flex rounded-lg border border-ftc-primary/30 bg-ftc-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-primary transition hover:border-ftc-primary/40 hover:bg-ftc-primary/12"
                >
                  Open Group Chat
                </Link>
              ) : (
                <p className="mt-2 text-xs text-ftc-text-muted">
                  Group chat unlocks after you accept.
                </p>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {canRespond && booking.status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onDecline}
            disabled={responding || cancelling}
            className="flex-1 rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={responding || cancelling}
            className="flex-1 rounded-xl border border-ftc-primary/40 bg-ftc-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-primary/80 transition hover:border-ftc-primary/50 hover:bg-ftc-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      ) : null}

      {showCancel ? (
        <div className="mt-4">
          <CancelBookingRequestButton
            loading={Boolean(cancelling)}
            onConfirm={onCancel}
          />
        </div>
      ) : null}
    </div>
  );
}

function BookingDetail({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">{label}</dt>
      <dd className={`mt-0.5 break-words ${muted ? "text-ftc-text-muted" : "text-ftc-text"}`}>{value}</dd>
    </div>
  );
}

export function buildUpdatedBookingMessage(
  booking: BookingRequest,
  status: Exclude<BookingRequestStatus, "pending">,
): string {
  return formatBookingRequestMessage({ ...booking, status });
}
