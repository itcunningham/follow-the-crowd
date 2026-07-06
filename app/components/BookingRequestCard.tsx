"use client";

import { useState } from "react";
import Link from "next/link";
import BookingDetailGrid, { BookingDetailItem } from "@/app/components/booking/BookingDetailGrid";
import BookingRateProposalPanel, {
  BookingRateProposalNotice,
} from "@/app/components/booking/BookingRateProposalPanel";
import ProposeBookingRateSheet from "@/app/components/booking/ProposeBookingRateSheet";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import { EventCoverImageContextThumb } from "@/app/components/events/EventCoverImageDisplay";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import {
  canCancelBookingRequest,
  canProposeBookingRate,
  canRespondToRateProposal,
  formatBookingRequestMessage,
  getAcceptedBookingCancellationRole,
  getBookingCollapsedOfferSummary,
  getBookingCollapsedUrgentLabel,
  getBookingCancelledDmBadgeClass,
  getBookingCancelledDmCardClass,
  getBookingGroupChatAccess,
  getBookingOfferRateLabel,
  getBookingRateDetailLabel,
  hasPendingRateProposal,
  formatBookingStatusLabel,
  resolveBookingCancellationReasonLabel,
  resolveBookingCancelledByLabel,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { rateDigitsToInteger } from "@/lib/bookingRate";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

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
  eventHasAcceptedBooking = false,
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
  eventHasAcceptedBooking?: boolean;
}) {
  const [proposeSheetOpen, setProposeSheetOpen] = useState(false);
  const groupChatAccess = getBookingGroupChatAccess(booking, currentUserId, {
    eventHasAcceptedBooking,
  });
  const showPendingCancel = canCancelBookingRequest(booking, currentUserId) && onCancel;
  const acceptedCancellationRole = getAcceptedBookingCancellationRole(booking, currentUserId);
  const showAcceptedCancel = acceptedCancellationRole && onCancelAccepted;
  const cancelledByLabel = resolveBookingCancelledByLabel(booking, profiles);
  const cancellationReasonLabel = resolveBookingCancellationReasonLabel(booking);
  const isCancelled = booking.status === "cancelled";
  const isPending = booking.status === "pending";
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
  const showOpenOfferLabel = bookingLoaded && booking.rate_mode === "open" && !pendingProposal;
  const showActionButtons = bookingLoaded && !bookingLoading;

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
  const collapsedOfferSummary = getBookingCollapsedOfferSummary(booking);
  const collapsedDateVenue = [booking.event_date?.trim(), booking.venue?.trim()]
    .filter(Boolean)
    .join(" · ");
  const collapsedTitle = booking.event_name.trim() || "Booking request";
  const cancelledCardClass = getBookingCancelledDmCardClass();
  const cancelledBadgeClass = getBookingCancelledDmBadgeClass();

  function renderChevronDown() {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-ftc-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  function renderChevronUp() {
    return (
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
    );
  }

  function renderCancelledStatusBadge() {
    return (
      <span className={cancelledBadgeClass}>{formatBookingStatusLabel("cancelled")}</span>
    );
  }

  function renderCancelledDetailsGrid() {
    return (
      <BookingDetailGrid>
        <BookingDetailItem label="Venue" value={booking.venue} />
        <BookingDetailItem label="Date" value={booking.event_date} />
        <BookingDetailItem label="Set time" value={booking.set_time} />
        <BookingDetailItem label={rateDetailLabel} value={offerRateLabel} />
        {booking.notes ? <BookingDetailItem label="Notes" value={booking.notes} /> : null}
        {cancelledByLabel ? (
          <BookingDetailItem label="Cancelled by" value={cancelledByLabel} />
        ) : null}
        {cancellationReasonLabel ? (
          <BookingDetailItem label="Reason" value={cancellationReasonLabel} />
        ) : null}
      </BookingDetailGrid>
    );
  }

  if (collapsible && !expanded && isCancelled) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className={`w-full max-w-sm rounded-2xl p-3 text-left transition ${cancelledCardClass} hover:border-[var(--ftc-color-danger)]/50`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-ftc-text">
            {collapsedTitle}
          </p>
          {renderCancelledStatusBadge()}
        </div>

        {collapsedDateVenue ? (
          <p className="mt-2 break-words text-xs text-ftc-text-muted">{collapsedDateVenue}</p>
        ) : null}

        {cancellationReasonLabel ? (
          <p className="mt-1 break-words text-xs text-[var(--ftc-color-danger)]/90">
            {cancellationReasonLabel}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--ftc-color-danger)]/20 pt-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
            View details
          </span>
          {renderChevronDown()}
        </div>
      </button>
    );
  }

  if (collapsible && !expanded) {
    return (
      <>
        <button
          type="button"
          onClick={handleExpand}
          className="w-full max-w-sm rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-3 text-left transition hover:border-ftc-border-strong active:border-ftc-border-strong"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Booking request
              </p>
              <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-ftc-text">
                {collapsedTitle}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {urgentLabel ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
              {urgentLabel}
            </p>
          ) : null}

          <p className="mt-2 break-words text-xs text-ftc-text-secondary">
            {collapsedOfferSummary}
          </p>

          {collapsedDateVenue ? (
            <p className="mt-1 break-words text-xs text-ftc-text-muted">{collapsedDateVenue}</p>
          ) : null}

          {cancellationReasonLabel ? (
            <p className="mt-1 break-words text-xs text-ftc-text-muted">
              {cancellationReasonLabel}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-ftc-border-subtle pt-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              View details
            </span>
            {renderChevronDown()}
          </div>
        </button>

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

  if (isCancelled) {
    return (
      <div className={`w-full max-w-sm rounded-2xl p-4 ${cancelledCardClass}`}>
        {collapsible ? (
          <button
            type="button"
            onClick={handleCollapse}
            className="-mx-1 -mt-1 mb-3 flex w-[calc(100%+0.5rem)] items-center justify-between gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-[var(--ftc-color-danger)]/10"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              Hide details
            </span>
            {renderChevronUp()}
          </button>
        ) : null}

        <button
          type="button"
          onClick={collapsible ? handleCollapse : undefined}
          disabled={!collapsible}
          className={`flex min-w-0 w-full items-start gap-3 text-left ${
            collapsible
              ? "cursor-pointer rounded-xl transition hover:bg-[var(--ftc-color-danger)]/10"
              : "cursor-default"
          }`}
        >
          <EventCoverImageContextThumb
            eventName={booking.event_name}
            coverImageUrl={coverImageUrl}
            fallbackColour={fallbackColour}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
              Booking request
            </p>
            <h3 className="mt-1 break-words text-base font-semibold leading-snug text-ftc-text">
              {booking.event_name}
            </h3>
          </div>
          {renderCancelledStatusBadge()}
        </button>

        <div className="mt-4">{renderCancelledDetailsGrid()}</div>

        {booking.event_id ? (
          <Link
            href={`/events/${booking.event_id}`}
            className="mt-4 inline-flex rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong"
          >
            View event
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-sm rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4">
        {collapsible ? (
          <button
            type="button"
            onClick={handleCollapse}
            className="-mx-1 -mt-1 mb-3 flex w-[calc(100%+0.5rem)] items-center justify-between gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-ftc-bg-elevated/60"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              Hide details
            </span>
            {renderChevronUp()}
          </button>
        ) : null}

        {collapsible ? (
          <button
            type="button"
            onClick={handleCollapse}
            className="flex min-w-0 w-full cursor-pointer items-start gap-3 rounded-xl text-left transition hover:bg-ftc-bg-elevated/60"
          >
            <EventCoverImageContextThumb
              eventName={booking.event_name}
              coverImageUrl={coverImageUrl}
              fallbackColour={fallbackColour}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Booking request
              </p>
              <h3 className="mt-1 break-words text-base font-semibold leading-snug text-ftc-text">
                {booking.event_name}
              </h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <BookingStatusBadge status={booking.status} />
              {showOpenOfferLabel ? (
                <span className="inline-flex rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
                  Ask for rate
                </span>
              ) : null}
              {pendingProposal ? (
                <span className="inline-flex rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
                  Rate proposed
                </span>
              ) : null}
            </div>
          </button>
        ) : (
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
              <h3 className="mt-1 break-words text-base font-semibold leading-snug text-ftc-text">
                {booking.event_name}
              </h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <BookingStatusBadge status={booking.status} />
              {showOpenOfferLabel ? (
                <span className="inline-flex rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
                  Ask for rate
                </span>
              ) : null}
              {pendingProposal ? (
                <span className="inline-flex rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
                  Rate proposed
                </span>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-4">
          <BookingDetailGrid>
            <BookingDetailItem label="Venue" value={booking.venue} />
            <BookingDetailItem label="Date" value={booking.event_date} />
            <BookingDetailItem label="Set time" value={booking.set_time} />
            <BookingDetailItem label={rateDetailLabel} value={offerRateLabel} />
            {booking.notes ? <BookingDetailItem label="Notes" value={booking.notes} /> : null}
            {cancelledByLabel ? (
              <BookingDetailItem label="Cancelled by" value={cancelledByLabel} />
            ) : null}
            {cancellationReasonLabel ? (
              <BookingDetailItem label="Reason" value={cancellationReasonLabel} />
            ) : null}
          </BookingDetailGrid>
        </div>

        {!canReviewProposal ? (
          <BookingRateProposalNotice booking={booking} currentUserId={currentUserId} />
        ) : null}

        {canReviewProposal ? (
          <BookingRateProposalPanel
            booking={booking}
            currentUserId={currentUserId}
            loading={actionDisabled}
            onAcceptProposal={onAcceptProposal!}
            onKeepOriginalOffer={onKeepOriginalOffer!}
            onDeclineBooking={onCancel}
          />
        ) : null}

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

        {bookingLoading ? (
          <p className="mt-4 text-xs text-ftc-text-muted">Loading booking…</p>
        ) : null}

        {showActionButtons && canRespond && isPending && !pendingProposal ? (
          <div className="mt-4 flex flex-col gap-2">
            {showDjOpenOfferActions ? (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={actionDisabled}
                  className="ftc-btn-primary w-full px-3 py-2.5 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
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
                <button
                  type="button"
                  onClick={onDecline}
                  disabled={actionDisabled}
                  className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-red-500/35 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onDecline}
                  disabled={actionDisabled}
                  className="flex-1 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-red-500/35 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={actionDisabled}
                  className="ftc-btn-primary flex-1 px-3 py-2.5 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="mt-4">
            <button
              type="button"
              onClick={onDecline}
              disabled={actionDisabled}
              className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-red-500/35 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        ) : null}

        {showPendingCancel && !canReviewProposal ? (
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
