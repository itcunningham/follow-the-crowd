"use client";

import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import { formatIntegerRateDisplay } from "@/lib/bookingRate";
import { hasDeclinedRateProposal, hasPendingRateProposal, type BookingRequest } from "@/lib/bookingRequests";

const PROPOSAL_PRIMARY_ACTION_CLASS =
  "ftc-btn-primary w-full px-3 py-2.5 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

const PROPOSAL_SECONDARY_ACTION_CLASS =
  "inline-flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50";

const PROPOSAL_SECONDARY_ACTIONS_ROW_CLASS = "flex gap-2";

const PROPOSAL_SECONDARY_CANCEL_CLASS = "min-w-0 flex-1";

export default function BookingRateProposalPanel({
  booking,
  currentUserId,
  loading,
  onAcceptProposal,
  onKeepOriginalOffer,
  onDeclineBooking,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  loading?: boolean;
  onAcceptProposal: () => void | Promise<void>;
  onKeepOriginalOffer: () => void | Promise<void>;
  onDeclineBooking?: () => void | Promise<void>;
}) {
  if (!hasPendingRateProposal(booking) || booking.sender_id !== currentUserId) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
        Rate proposed
      </p>
      <p className="mt-1 text-sm font-semibold text-ftc-text">
        {formatIntegerRateDisplay(booking.proposed_rate)}
      </p>
      {booking.proposed_rate_note?.trim() ? (
        <p className="mt-2 text-sm leading-relaxed text-ftc-text-muted">
          {booking.proposed_rate_note.trim()}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void onAcceptProposal()}
          className={PROPOSAL_PRIMARY_ACTION_CLASS}
        >
          Accept proposed rate
        </button>
        <div className={PROPOSAL_SECONDARY_ACTIONS_ROW_CLASS}>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onKeepOriginalOffer()}
            className={PROPOSAL_SECONDARY_ACTION_CLASS}
          >
            Keep offer
          </button>
          {onDeclineBooking ? (
            <CancelBookingRequestButton
              compact
              label="Cancel"
              loading={Boolean(loading)}
              onConfirm={onDeclineBooking}
              className={PROPOSAL_SECONDARY_CANCEL_CLASS}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BookingRateProposalNotice({
  booking,
  currentUserId,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
}) {
  if (hasDeclinedRateProposal(booking) && booking.recipient_id === currentUserId) {
    return (
      <div className="mt-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
          Rate proposal
        </p>
        <p className="mt-1 text-sm text-ftc-text-muted">
          Proposal declined · original offer still available
        </p>
      </div>
    );
  }

  if (!hasPendingRateProposal(booking)) {
    return null;
  }

  const isRecipient = booking.recipient_id === currentUserId;

  if (isRecipient) {
    return (
      <div className="mt-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
          Your proposal
        </p>
        <p className="mt-1 text-sm font-semibold text-ftc-text">
          {formatIntegerRateDisplay(booking.proposed_rate)} pending review
        </p>
        {booking.proposed_rate_note?.trim() ? (
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-muted">
            {booking.proposed_rate_note.trim()}
          </p>
        ) : null}
      </div>
    );
  }

  if (booking.sender_id === currentUserId) {
    return (
      <div className="mt-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
          Rate proposed
        </p>
        <p className="mt-1 text-sm font-semibold text-ftc-text">
          {formatIntegerRateDisplay(booking.proposed_rate)}
        </p>
        {booking.proposed_rate_note?.trim() ? (
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-muted">
            {booking.proposed_rate_note.trim()}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
