"use client";

import Link from "next/link";
import BookingDetailGrid, { BookingDetailItem } from "@/app/components/booking/BookingDetailGrid";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import { EventCoverImageContextThumb } from "@/app/components/events/EventCoverImageDisplay";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import {
  canCancelBookingRequest,
  formatBookingRequestMessage,
  getAcceptedBookingCancellationRole,
  getBookingGroupChatAccess,
  resolveBookingCancellationReasonLabel,
  resolveBookingCancelledByLabel,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { formatRateDisplay } from "@/lib/bookingRate";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

export default function BookingRequestCard({
  booking,
  currentUserId,
  canRespond,
  responding,
  cancelling,
  coverImageUrl,
  fallbackColour,
  profiles = new Map(),
  onAccept,
  onDecline,
  onCancel,
  onCancelAccepted,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  canRespond: boolean;
  responding: boolean;
  cancelling?: boolean;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
  profiles?: Map<string, BookingRecipientProfile>;
  onAccept: () => void;
  onDecline: () => void;
  onCancel?: () => void | Promise<void>;
  onCancelAccepted?: (reason: string) => void | Promise<void>;
}) {
  const groupChatAccess = getBookingGroupChatAccess(booking, currentUserId);
  const showPendingCancel = canCancelBookingRequest(booking, currentUserId) && onCancel;
  const acceptedCancellationRole = getAcceptedBookingCancellationRole(booking, currentUserId);
  const showAcceptedCancel = acceptedCancellationRole && onCancelAccepted;
  const cancelledByLabel = resolveBookingCancelledByLabel(booking, profiles);
  const cancellationReasonLabel = resolveBookingCancellationReasonLabel(booking);
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4">
      <div className="flex min-w-0 items-start gap-3">
        <EventCoverImageContextThumb
          eventName={booking.event_name}
          coverImageUrl={coverImageUrl}
          fallbackColour={fallbackColour}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
            Booking request
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-ftc-text">
            {booking.event_name}
          </h3>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-4">
        <BookingDetailGrid>
          <BookingDetailItem label="Venue" value={booking.venue} />
          <BookingDetailItem label="Date" value={booking.event_date} />
          <BookingDetailItem label="Set time" value={booking.set_time} />
          <BookingDetailItem label="Rate" value={formatRateDisplay(booking.fee)} />
          {booking.notes ? <BookingDetailItem label="Notes" value={booking.notes} /> : null}
          {cancelledByLabel ? (
            <BookingDetailItem label="Cancelled by" value={cancelledByLabel} />
          ) : null}
          {cancellationReasonLabel ? (
            <BookingDetailItem label="Reason" value={cancellationReasonLabel} />
          ) : null}
        </BookingDetailGrid>
      </div>

      {booking.event_id && !isCancelled ? (
        <>
          <Link
            href={`/events/${booking.event_id}`}
            className="mt-4 inline-flex rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong"
          >
            View event
          </Link>

          {groupChatAccess && groupChatAccess.kind !== "hidden" ? (
            <div className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Event group chat
              </p>
              {groupChatAccess.kind === "open" ? (
                <Link
                  href={groupChatAccess.href}
                  className="mt-2 inline-flex ftc-btn-primary px-3 py-1.5 text-xs uppercase tracking-wide"
                >
                  Open group chat
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
            className="flex-1 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-red-500/35 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={responding || cancelling}
            className="ftc-btn-primary flex-1 px-3 py-2.5 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      ) : null}

      {showPendingCancel ? (
        <div className="mt-4">
          <CancelBookingRequestButton
            loading={Boolean(cancelling)}
            onConfirm={onCancel}
          />
        </div>
      ) : null}

      {showAcceptedCancel ? (
        <div className="mt-4">
          <CancelAcceptedBookingButton
            role={acceptedCancellationRole}
            loading={Boolean(cancelling)}
            onConfirm={onCancelAccepted}
          />
        </div>
      ) : null}
    </div>
  );
}

export function buildUpdatedBookingMessage(
  booking: BookingRequest,
  status: Exclude<BookingRequestStatus, "pending">,
): string {
  return formatBookingRequestMessage({ ...booking, status });
}
