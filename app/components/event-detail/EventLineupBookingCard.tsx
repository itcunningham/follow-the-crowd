"use client";

import Link from "next/link";
import BookingRateProposalPanel, {
  BookingRateProposalNotice,
} from "@/app/components/booking/BookingRateProposalPanel";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import HideDeclinedBookingButton from "@/app/components/HideDeclinedBookingButton";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { FtcMetaRow, FtcRateIcon } from "@/app/components/ftc/FtcCompactMeta";
import {
  EVENT_DETAIL_BADGE_COMPACT,
  EVENT_DETAIL_BTN_DESTRUCTIVE,
  EVENT_DETAIL_BTN_SECONDARY,
} from "@/app/components/event-detail/eventDetailUi";
import { formatRateDisplay } from "@/lib/bookingRate";
import {
  canCancelBookingRequest,
  getAcceptedBookingCancellationRole,
  hasPendingRateProposal,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { buildEventDetailDmThreadHref } from "@/lib/dm/threadNavigation";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

function getLineupRateLine(booking: BookingRequest): string {
  const offerType = booking.rate_mode === "open" ? "Ask for rate" : "Fixed offer";
  const amount = formatRateDisplay(booking.fee);

  return amount !== "$" ? `${offerType} · ${amount}` : offerType;
}

export default function EventLineupBookingCard({
  booking,
  profile,
  currentUserId,
  eventDetailId,
  readOnly = false,
  cancelledByLabel,
  cancellationReasonLabel,
  canHideFromLineup,
  hiding,
  hideDisabled,
  cancelling,
  proposalLoading,
  onHideFromLineup,
  onCancelBooking,
  onCancelAccepted,
  onAcceptProposal,
  onKeepOriginalOffer,
}: {
  booking: BookingRequest;
  profile?: BookingRecipientProfile;
  currentUserId: string | null;
  eventDetailId?: string | null;
  readOnly?: boolean;
  cancelledByLabel?: string | null;
  cancellationReasonLabel?: string | null;
  canHideFromLineup: boolean;
  hiding: boolean;
  hideDisabled: boolean;
  cancelling: boolean;
  proposalLoading: boolean;
  onHideFromLineup: () => void;
  onCancelBooking: () => void;
  onCancelAccepted: (reason: string) => void | Promise<void>;
  onAcceptProposal: () => void | Promise<void>;
  onKeepOriginalOffer: () => void | Promise<void>;
}) {
  const displayName = profile?.display_name?.trim() || "DJ";
  const genre = profile?.genre?.trim();
  const acceptedCancellationRole = getAcceptedBookingCancellationRole(booking, currentUserId);
  const rateLine = getLineupRateLine(booking);
  const pendingProposal = hasPendingRateProposal(booking);

  return (
    <div
      className={`ftc-lineup-booking-card relative p-3.5 transition duration-150 ease-out motion-reduce:transition-none ${
        canHideFromLineup ? "pr-11 sm:pr-12" : ""
      }`}
    >
      {canHideFromLineup ? (
        <HideDeclinedBookingButton
          className="absolute right-2.5 top-2.5"
          loading={hiding}
          disabled={hideDisabled}
          onConfirm={onHideFromLineup}
        />
      ) : null}

      <div className="flex min-w-0 items-start gap-3">
        <ProfileAvatar name={displayName} avatarUrl={profile?.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-snug text-ftc-text">{displayName}</p>
              {genre ? (
                <p className="mt-0.5 text-xs text-ftc-text-muted">{genre}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <BookingStatusBadge status={booking.status} variant="compact" />
              {pendingProposal ? (
                <span
                  className={`${EVENT_DETAIL_BADGE_COMPACT} border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-primary`}
                >
                  Rate proposed
                </span>
              ) : null}
            </div>
          </div>

          <ul className="mt-2 space-y-1">
            <FtcMetaRow icon={<FtcRateIcon />}>{rateLine}</FtcMetaRow>
          </ul>

          {cancelledByLabel ? (
            <p className="mt-2 text-xs leading-snug text-ftc-text-muted">
              Cancelled by {cancelledByLabel}
            </p>
          ) : null}
          {cancellationReasonLabel ? (
            <p className="text-xs leading-snug text-ftc-text-muted">
              Reason: {cancellationReasonLabel}
            </p>
          ) : null}

          {readOnly ? (
            <BookingRateProposalNotice booking={booking} currentUserId={currentUserId} />
          ) : (
            <BookingRateProposalPanel
              booking={booking}
              currentUserId={currentUserId}
              loading={proposalLoading}
              onAcceptProposal={onAcceptProposal}
              onKeepOriginalOffer={onKeepOriginalOffer}
              onDeclineBooking={onCancelBooking}
            />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!readOnly && canCancelBookingRequest(booking, currentUserId) ? (
          <CancelBookingRequestButton
            loading={cancelling}
            onConfirm={onCancelBooking}
            className={`${EVENT_DETAIL_BTN_DESTRUCTIVE} w-full sm:w-auto sm:min-w-[7.5rem]`}
          />
        ) : null}
        {!readOnly && acceptedCancellationRole === "planner" ? (
          <CancelAcceptedBookingButton
            role="planner"
            loading={cancelling}
            onConfirm={onCancelAccepted}
            className={`${EVENT_DETAIL_BTN_DESTRUCTIVE} w-full sm:w-auto sm:min-w-[7.5rem]`}
          />
        ) : null}
        {booking.conversation_id ? (
          <Link
            href={
              eventDetailId
                ? buildEventDetailDmThreadHref(booking.conversation_id, eventDetailId)
                : `/dm/${booking.conversation_id}`
            }
            className={`${EVENT_DETAIL_BTN_SECONDARY} w-full sm:w-auto sm:min-w-[7.5rem]`}
          >
            Open DM
          </Link>
        ) : null}
      </div>
    </div>
  );
}
