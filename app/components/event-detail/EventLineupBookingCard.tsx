"use client";

import Link from "next/link";
import BookingRateProposalPanel, {
  BookingRateProposalNotice,
} from "@/app/components/booking/BookingRateProposalPanel";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import HideDeclinedBookingButton from "@/app/components/HideDeclinedBookingButton";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import { EventDetailBookingCancellationDetails } from "@/app/components/event-detail/EventDetailBookingCancellationDetails";
import {
  EVENT_DETAIL_BADGE_COMPACT,
  EVENT_DETAIL_LINEUP_ACTION_BTN,
  EVENT_DETAIL_LINEUP_ACTIONS_ROW,
  EVENT_DETAIL_LINEUP_BTN_SECONDARY,
} from "@/app/components/event-detail/eventDetailUi";
import { formatRateDisplay } from "@/lib/bookingRate";
import {
  canCancelBookingRequest,
  getAcceptedBookingCancellationRole,
  hasPendingRateProposal,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { buildEventDetailDmThreadHref } from "@/lib/dm/threadNavigation";
import type { CalendarOriginState } from "@/lib/bookings/gigsCalendarNavigation";
import { buildEventDetailProfileHref } from "@/lib/profileNavigation";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";
import { looksLikeUserId } from "@/lib/user/displayName";

function getLineupRateLine(booking: BookingRequest): string {
  if (booking.rate_mode === "open") {
    return "Ask for rate";
  }

  const amount = formatRateDisplay(booking.fee);

  return amount !== "$" ? `Fixed offer • ${amount}` : "Fixed offer";
}

export default function EventLineupBookingCard({
  booking,
  profile,
  currentUserId,
  eventDetailId,
  eventDetailFromTab = null,
  calendarOrigin = null,
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
  eventDetailFromTab?: string | null;
  calendarOrigin?: CalendarOriginState | null;
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
  const djUserId = booking.recipient_id;
  const acceptedCancellationRole = getAcceptedBookingCancellationRole(booking, currentUserId);
  const rateLine = getLineupRateLine(booking);
  const pendingProposal = hasPendingRateProposal(booking);
  const showCancelRequest =
    !readOnly && canCancelBookingRequest(booking, currentUserId);
  const showCancelAccepted =
    !readOnly && acceptedCancellationRole === "planner";
  const showOpenDm = Boolean(booking.conversation_id);
  const showActions = showCancelRequest || showCancelAccepted || showOpenDm;
  const actionButtonClass = `${EVENT_DETAIL_LINEUP_ACTION_BTN}`;
  const profileHref =
    eventDetailId && looksLikeUserId(eventDetailId)
      ? buildEventDetailProfileHref(djUserId, {
          eventId: eventDetailId,
          fromTab: eventDetailFromTab,
          calendarOrigin,
        })
      : `/profile/${djUserId}`;

  return (
    <div
      className={`ftc-lineup-booking-card relative p-3 transition duration-150 ease-out motion-reduce:transition-none ${
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
        <ChatProfileAvatarLink
          userId={djUserId}
          name={displayName}
          avatarUrl={profile?.avatar_url}
          size="sm"
          href={profileHref}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={profileHref}
                className="text-base font-bold leading-snug text-ftc-text transition hover:text-ftc-primary"
              >
                {displayName}
              </Link>
              {genre ? (
                <p className="mt-0.5 truncate text-xs text-ftc-text-muted">{genre}</p>
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

          <p className="mt-1.5 text-xs leading-snug text-ftc-text-muted">{rateLine}</p>

          {cancelledByLabel || cancellationReasonLabel ? (
            <EventDetailBookingCancellationDetails
              cancelledByLabel={cancelledByLabel}
              cancellationReasonLabel={cancellationReasonLabel}
              textSizeClass="text-xs"
            />
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

      {showActions ? (
        <div className={EVENT_DETAIL_LINEUP_ACTIONS_ROW}>
          {showOpenDm ? (
            <Link
              href={
                eventDetailId
                  ? buildEventDetailDmThreadHref(
                      booking.conversation_id!,
                      eventDetailId,
                      calendarOrigin,
                    )
                  : `/dm/${booking.conversation_id}`
              }
              className={`${EVENT_DETAIL_LINEUP_BTN_SECONDARY} ${actionButtonClass}`}
            >
              Message
            </Link>
          ) : null}
          {showCancelRequest ? (
            <CancelBookingRequestButton
              compact
              label="Cancel"
              loading={cancelling}
              onConfirm={onCancelBooking}
              className={actionButtonClass}
            />
          ) : null}
          {showCancelAccepted ? (
            <CancelAcceptedBookingButton
              compact
              role="planner"
              loading={cancelling}
              onConfirm={onCancelAccepted}
              className={actionButtonClass}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
