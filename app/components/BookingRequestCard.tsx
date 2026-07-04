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
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getBookingStatusBadgeClass(status)}`}
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
    <div className="w-full max-w-sm rounded-2xl border border-blue-500/45 bg-blue-600/10 p-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-400">
            Booking request
          </p>
          <h3 className="mt-1 text-base font-semibold text-zinc-50">{booking.event_name}</h3>
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
            className="mt-4 inline-flex rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-300"
          >
            View event
          </Link>

          {groupChatAccess && groupChatAccess.kind !== "hidden" ? (
            <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Event Group Chat
              </p>
              {groupChatAccess.kind === "open" ? (
                <Link
                  href={groupChatAccess.href}
                  className="mt-2 inline-flex rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20"
                >
                  Open Group Chat
                </Link>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
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
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={responding || cancelling}
            className="flex-1 rounded-xl border border-blue-500/45 bg-blue-600/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-100 transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
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
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 ${muted ? "text-zinc-500" : "text-zinc-200"}`}>{value}</dd>
    </div>
  );
}

export function buildUpdatedBookingMessage(
  booking: BookingRequest,
  status: Exclude<BookingRequestStatus, "pending">,
): string {
  return formatBookingRequestMessage({ ...booking, status });
}
