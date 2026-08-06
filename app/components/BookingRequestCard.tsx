"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import BookingCardCompactSummary, {
  getBookingCardCompactRateLine,
} from "@/app/components/booking/BookingCardCompactSummary";
import BookingRateProposalPanel, {
  BookingRateProposalNotice,
} from "@/app/components/booking/BookingRateProposalPanel";
import DeclineConfirmButton from "@/app/components/booking/DeclineConfirmButton";
import ProposeBookingRateSheet from "@/app/components/booking/ProposeBookingRateSheet";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import { EventDetailSecondaryAction } from "@/app/components/event-detail/EventDetailBottomBar";
import {
  DM_BOOKING_CARD_ACCEPT_BUTTON_CLASS,
  DM_BOOKING_CARD_ACTIONS_CLASS,
  DM_BOOKING_CARD_DECLINE_ARMED_BUTTON_CLASS,
  DM_BOOKING_CARD_DECLINE_BUTTON_CLASS,
  DM_BOOKING_CARD_PAIRED_ACTIONS_ROW_CLASS,
  DM_BOOKING_CARD_PAIRED_CANCEL_CLASS,
  DM_BOOKING_CARD_PAIRED_VIEW_EVENT_CLASS,
  DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS,
  DM_BOOKING_CARD_SHELL_CLASS,
  DmBookingCardCollapsedDetails,
  DmBookingCardCollapsedHeader,
  DmBookingCardExpandFooter,
} from "@/app/components/booking/DmBookingCardLayout";
import {
  canCancelBookingRequest,
  canProposeBookingRate,
  canRespondToRateProposal,
  formatBookingRequestMessage,
  getAcceptedBookingCancellationRole,
  getBookingCollapsedOfferSummary,
  getBookingCollapsedUrgentLabel,
  getBookingGroupChatAccess,
  getBookingOfferRateLabel,
  getBookingRateDetailLabel,
  getEventCancelledBookingLabel,
  hasPendingRateProposal,
  isBookingAffectedByCancelledEvent,
  resolveBookingCancellationReasonLabel,
  resolveBookingCancelledByLabel,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { rateDigitsToInteger } from "@/lib/bookingRate";
import { formatBookingCardEventDate } from "@/lib/bookingDateTime";
import { buildEventDetailFromDmHref } from "@/lib/events/eventsListNavigation";
import type { DmThreadEntryContext } from "@/lib/dm/threadNavigation";
import {
  DM_BOOKING_CARD_EXPAND_PANEL_ATTR,
  DM_BOOKING_CARD_REQUEST_ID_ATTR,
} from "@/lib/dm/dmBookingCardExpandScroll";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";
import AnimatedExpandPanel from "@/app/components/AnimatedExpandPanel";

export default function BookingRequestCard({
  booking,
  currentUserId,
  bookingLoaded = true,
  bookingLoading = false,
  bookingSource = "live",
  canRespond,
  responding,
  cancelling,
  proposalLoading = false,
  coverImageUrl,
  fallbackColour,
  profiles = new Map(),
  onAccept,
  onDecline,
  onCancel,
  onCancelAccepted,
  onProposeRate,
  onAcceptProposal,
  onKeepOriginalOffer,
  collapsible = false,
  expanded = true,
  onExpandedChange,
  onNotesExpandedChange,
  useCompactDmCollapseHeader = false,
  eventHasAcceptedBooking = false,
  crewChatUnlocked = false,
  eventCancelled = false,
  dmConversationId = null,
  dmThreadEntryContext = null,
  anchorRef,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  bookingLoaded?: boolean;
  bookingLoading?: boolean;
  bookingSource?: "live" | "display";
  canRespond: boolean;
  responding: boolean;
  cancelling?: boolean;
  proposalLoading?: boolean;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
  profiles?: Map<string, BookingRecipientProfile>;
  onAccept: () => void;
  onDecline: () => void;
  onCancel?: () => void | Promise<void>;
  onCancelAccepted?: (reason: string) => void | Promise<void>;
  onProposeRate?: (proposedRate: number, note: string) => void | Promise<void>;
  onAcceptProposal?: () => void | Promise<void>;
  onKeepOriginalOffer?: () => void | Promise<void>;
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onNotesExpandedChange?: (expanded: boolean) => void;
  useCompactDmCollapseHeader?: boolean;
  eventHasAcceptedBooking?: boolean;
  crewChatUnlocked?: boolean;
  eventCancelled?: boolean;
  dmConversationId?: string | null;
  dmThreadEntryContext?: DmThreadEntryContext | null;
  anchorRef?: (element: HTMLElement | null) => void;
}) {
  const [proposeSheetOpen, setProposeSheetOpen] = useState(false);
  const isEventCancelledBooking = isBookingAffectedByCancelledEvent(booking, eventCancelled);
  const showAsCancelled = booking.status === "cancelled" || isEventCancelledBooking;
  const eventCancelledLabel = isEventCancelledBooking
    ? getEventCancelledBookingLabel(booking, currentUserId)
    : null;
  const groupChatAccess = getBookingGroupChatAccess(booking, currentUserId, {
    eventHasAcceptedBooking,
    eventCancelled,
    crewChatUnlocked,
  });
  const showPendingCancel =
    canCancelBookingRequest(booking, currentUserId) && onCancel && !isEventCancelledBooking;
  const acceptedCancellationRole = getAcceptedBookingCancellationRole(booking, currentUserId);
  const showAcceptedCancel =
    acceptedCancellationRole && onCancelAccepted && !isEventCancelledBooking;
  const cancelledByLabel = resolveBookingCancelledByLabel(booking, profiles);
  const cancellationReasonLabel = resolveBookingCancellationReasonLabel(booking);
  const isPending = booking.status === "pending";
  const isAccepted = booking.status === "accepted";
  const pendingProposal = bookingLoaded && hasPendingRateProposal(booking);
  const showDjOpenOfferActions =
    bookingLoaded && canProposeBookingRate(booking, currentUserId);
  const canReviewProposal =
    bookingLoaded &&
    canRespondToRateProposal(booking, currentUserId) &&
    Boolean(onAcceptProposal && onKeepOriginalOffer);
  const actionDisabled = responding || cancelling || proposalLoading;
  const offerRateLabel = getBookingOfferRateLabel(booking);
  const rateDetailLabel = getBookingRateDetailLabel(booking);
  const showActionButtons = bookingLoaded && !bookingLoading;
  const eventHref = booking.event_id
    ? dmConversationId
      ? buildEventDetailFromDmHref(
          booking.event_id,
          dmConversationId,
          booking.id,
          dmThreadEntryContext,
        )
      : `/events/${booking.event_id}`
    : null;
  const showPendingEventPairedActions =
    Boolean(booking.event_id && eventHref && !showAsCancelled && !isAccepted) &&
    showPendingCancel &&
    !canReviewProposal;

  async function handleProposeRate(rateDigits: string, note: string) {
    if (!onProposeRate) {
      return;
    }

    await onProposeRate(rateDigitsToInteger(rateDigits), note);
    setProposeSheetOpen(false);
  }

  function handleCollapse() {
    onExpandedChange?.(false);
  }

  function handleExpand() {
    onExpandedChange?.(true);
  }

  const urgentLabel = getBookingCollapsedUrgentLabel(booking, currentUserId, {
    canRespond,
    bookingLoaded,
  });
  const collapsedOfferSummary = getBookingCollapsedOfferSummary(booking, currentUserId);
  const collapsedDateVenue = [
    booking.event_date?.trim() ? formatBookingCardEventDate(booking.event_date) : "",
    booking.venue?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  const collapsedTitle = booking.event_name.trim() || "Booking request";
  const collapsedStatusMessage = eventCancelledLabel ?? null;
  const compactRateLine = getBookingCardCompactRateLine(
    booking,
    offerRateLabel,
    rateDetailLabel,
    pendingProposal,
  );

  function renderStatusBadge() {
    const displayStatus: BookingRequestStatus = showAsCancelled ? "cancelled" : booking.status;

    return <BookingStatusBadge status={displayStatus} />;
  }

  function renderExpandedHeader(statusBadge: ReactNode) {
    return (
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
            Booking request
          </p>
          <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-ftc-text">
            {booking.event_name}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">{statusBadge}</div>
      </div>
    );
  }

  function renderCompactSummary() {
    return (
      <BookingCardCompactSummary
        booking={booking}
        rateLine={pendingProposal ? "" : compactRateLine}
        eventStatusLabel={eventCancelledLabel}
        cancelledByLabel={cancelledByLabel}
        cancellationReasonLabel={cancellationReasonLabel}
        detailsOpen={expanded}
        onNotesExpandedChange={onNotesExpandedChange}
      />
    );
  }

  function renderCompactDmCollapseHeader(statusBadge: ReactNode) {
    return (
      <button
        type="button"
        onClick={handleCollapse}
        aria-expanded={true}
        aria-label={`${collapsedTitle}, hide booking details`}
        className="-mx-1 -mt-1 mb-2.5 w-[calc(100%+0.5rem)] min-h-[44px] rounded-xl px-1 py-2 text-left transition hover:bg-ftc-bg-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary"
      >
        <div className="flex items-start justify-between gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
              Booking request
            </p>
            <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-ftc-text">
              {collapsedTitle}
            </p>
          </div>
          {statusBadge}
        </div>
        <div className="mt-1.5 border-t border-ftc-border-subtle px-1 pt-1.5">
          <DmBookingCardExpandFooter label="Hide details" embedded />
        </div>
      </button>
    );
  }

  function renderExpandedBody() {
    return (
      <>
        {renderCompactSummary()}

        {!canReviewProposal ? (
          <BookingRateProposalNotice
            booking={booking}
            currentUserId={currentUserId}
            onNotesExpandedChange={onNotesExpandedChange}
          />
        ) : null}

        {canReviewProposal ? (
          <BookingRateProposalPanel
            booking={booking}
            currentUserId={currentUserId}
            loading={actionDisabled}
            onAcceptProposal={onAcceptProposal!}
            onKeepOriginalOffer={onKeepOriginalOffer!}
            onNotesExpandedChange={onNotesExpandedChange}
          />
        ) : null}

        {booking.event_id && eventHref && !showAsCancelled ? (
          isAccepted ? (
            <div className={DM_BOOKING_CARD_ACTIONS_CLASS}>
              <Link
                href={eventHref}
                className="ftc-btn-primary flex w-full items-center justify-center px-3 py-2.5 text-xs uppercase tracking-wide"
              >
                View
              </Link>
              {showAcceptedCancel ? (
                <CancelAcceptedBookingButton
                  role={acceptedCancellationRole}
                  loading={Boolean(cancelling)}
                  onConfirm={onCancelAccepted}
                  className="w-full border border-ftc-border-subtle bg-ftc-bg-elevated hover:border-red-500/35 hover:bg-ftc-bg-elevated hover:text-red-300"
                />
              ) : null}
            </div>
          ) : showPendingEventPairedActions ? (
            <div className={DM_BOOKING_CARD_PAIRED_ACTIONS_ROW_CLASS}>
              <CancelBookingRequestButton
                compact
                label="Cancel"
                loading={Boolean(cancelling)}
                onConfirm={onCancel}
                className={DM_BOOKING_CARD_PAIRED_CANCEL_CLASS}
              />
              <Link href={eventHref} className={DM_BOOKING_CARD_PAIRED_VIEW_EVENT_CLASS}>
                View
              </Link>
            </div>
          ) : (
            <div className={DM_BOOKING_CARD_ACTIONS_CLASS}>
              <Link href={eventHref} className={DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS}>
                View
              </Link>
              {canReviewProposal && showPendingCancel ? (
                <CancelBookingRequestButton
                  loading={Boolean(cancelling)}
                  onConfirm={onCancel}
                  className="w-full"
                />
              ) : null}
            </div>
          )
        ) : null}

        {/*
          Group chat is a place to go, not a third call to action: View event
          stays the primary CTA and Cancel stays the destructive one, so this
          reuses the same tappable nav row the event detail screens use
          (icon + title + chevron) rather than a second primary button. The
          bordered box that used to wrap it is gone — the booking card is
          already a card, so boxing a section inside it was a level of nesting
          that bought nothing.
        */}
        {booking.event_id &&
        !showAsCancelled &&
        groupChatAccess &&
        groupChatAccess.kind !== "hidden" ? (
          <div className="mt-4">
            {groupChatAccess.kind === "open" ? (
              <div>
                <EventDetailSecondaryAction href={groupChatAccess.href}>
                  Group chat
                </EventDetailSecondaryAction>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ftc-text-muted">
                Group chat unlocks after you accept.
              </p>
            )}
          </div>
        ) : null}

        {bookingLoading ? (
          <p className="mt-4 text-xs text-ftc-text-muted">Loading booking…</p>
        ) : null}

        {showActionButtons && canRespond && isPending && !pendingProposal ? (
          <div className={DM_BOOKING_CARD_ACTIONS_CLASS}>
            {showDjOpenOfferActions ? (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={actionDisabled}
                  className={`${DM_BOOKING_CARD_ACCEPT_BUTTON_CLASS} w-full`}
                >
                  Accept offer
                </button>
                {onProposeRate ? (
                  <button
                    type="button"
                    onClick={() => setProposeSheetOpen(true)}
                    disabled={actionDisabled}
                    className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Propose rate
                  </button>
                ) : null}
                <DeclineConfirmButton
                  onConfirm={onDecline}
                  disabled={actionDisabled}
                  idleClassName={DM_BOOKING_CARD_DECLINE_BUTTON_CLASS}
                  armedClassName={DM_BOOKING_CARD_DECLINE_ARMED_BUTTON_CLASS}
                  className="w-full"
                />
              </>
            ) : (
              <div className="flex gap-2">
                <DeclineConfirmButton
                  onConfirm={onDecline}
                  disabled={actionDisabled}
                  idleClassName={DM_BOOKING_CARD_DECLINE_BUTTON_CLASS}
                  armedClassName={DM_BOOKING_CARD_DECLINE_ARMED_BUTTON_CLASS}
                  className="flex-[0.92]"
                />
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={actionDisabled}
                  className={`${DM_BOOKING_CARD_ACCEPT_BUTTON_CLASS} flex-[1.08]`}
                >
                  Accept
                </button>
              </div>
            )}
          </div>
        ) : null}

        {showActionButtons &&
        canRespond &&
        isPending &&
        pendingProposal &&
        booking.recipient_id === currentUserId ? (
          <div className={DM_BOOKING_CARD_ACTIONS_CLASS}>
            <DeclineConfirmButton
              onConfirm={onDecline}
              disabled={actionDisabled}
              idleClassName={DM_BOOKING_CARD_DECLINE_BUTTON_CLASS}
              armedClassName={DM_BOOKING_CARD_DECLINE_ARMED_BUTTON_CLASS}
              className="w-full"
            />
          </div>
        ) : null}

        {showPendingCancel &&
        !showPendingEventPairedActions &&
        !(canReviewProposal && booking.event_id && eventHref && !showAsCancelled && !isAccepted) ? (
          <div className={DM_BOOKING_CARD_ACTIONS_CLASS}>
            <CancelBookingRequestButton
              loading={Boolean(cancelling)}
              onConfirm={onCancel}
              className="w-full"
            />
          </div>
        ) : null}

        {showAcceptedCancel && !(isAccepted && booking.event_id && eventHref) ? (
          <div className={DM_BOOKING_CARD_ACTIONS_CLASS}>
            <CancelAcceptedBookingButton
              role={acceptedCancellationRole}
              loading={Boolean(cancelling)}
              onConfirm={onCancelAccepted}
              className="w-full border border-ftc-border-subtle bg-ftc-bg-elevated hover:border-red-500/35 hover:bg-ftc-bg-elevated hover:text-red-300"
            />
          </div>
        ) : null}
      </>
    );
  }

  if (collapsible) {
    return (
      <>
        <div
          ref={anchorRef}
          className={DM_BOOKING_CARD_SHELL_CLASS}
          data-dm-booking-card-anchor
          {...{ [DM_BOOKING_CARD_REQUEST_ID_ATTR]: booking.id }}
        >
          {!expanded ? (
            <button
              type="button"
              onClick={handleExpand}
              className="w-full text-left transition hover:opacity-95 active:opacity-90"
            >
              <DmBookingCardCollapsedHeader
                title={collapsedTitle}
                badge={renderStatusBadge()}
              />

              {urgentLabel ? (
                <p
                  className={
                    urgentLabel === "Proposed"
                      ? "mt-2 text-xs font-medium text-ftc-text-muted"
                      : "mt-2 text-xs font-semibold uppercase tracking-wide text-ftc-primary"
                  }
                >
                  {urgentLabel}
                </p>
              ) : null}

              <DmBookingCardCollapsedDetails
                offerSummary={collapsedOfferSummary}
                dateVenue={collapsedDateVenue || null}
                statusMessage={collapsedStatusMessage}
              />

              <DmBookingCardExpandFooter label="View details" />
            </button>
          ) : useCompactDmCollapseHeader ? (
            renderCompactDmCollapseHeader(renderStatusBadge())
          ) : (
            <>
              <button
                type="button"
                onClick={handleCollapse}
                className="-mx-1 -mt-1 mb-3 flex w-[calc(100%+0.5rem)] items-center justify-between gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-ftc-bg-elevated/60"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
                  Hide details
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-ftc-text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {renderExpandedHeader(renderStatusBadge())}
            </>
          )}

          <AnimatedExpandPanel open={expanded} dataAttribute={DM_BOOKING_CARD_EXPAND_PANEL_ATTR}>
            <div className={expanded ? "mt-3" : ""}>{renderExpandedBody()}</div>
          </AnimatedExpandPanel>
        </div>

        <ProposeBookingRateSheet
          open={proposeSheetOpen}
          loading={proposalLoading}
          onClose={() => {
            if (!proposalLoading) {
              setProposeSheetOpen(false);
            }
          }}
          onSubmit={handleProposeRate}
        />
      </>
    );
  }

  return (
    <>
      <div
        ref={anchorRef}
        className={DM_BOOKING_CARD_SHELL_CLASS}
        data-dm-booking-card-anchor
        {...{ [DM_BOOKING_CARD_REQUEST_ID_ATTR]: booking.id }}
      >
        {renderExpandedHeader(renderStatusBadge())}

        <div className="mt-3">{renderExpandedBody()}</div>
      </div>

      <ProposeBookingRateSheet
        open={proposeSheetOpen}
        loading={proposalLoading}
        onClose={() => {
          if (!proposalLoading) {
            setProposeSheetOpen(false);
          }
        }}
        onSubmit={handleProposeRate}
      />
    </>
  );
}

export function buildUpdatedBookingMessage(
  booking: BookingRequest,
  status: Exclude<BookingRequestStatus, "pending">,
): string {
  return formatBookingRequestMessage({ ...booking, status });
}
