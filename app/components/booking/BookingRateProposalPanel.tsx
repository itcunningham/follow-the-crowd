"use client";

import { type ReactNode } from "react";
import BookingCardExpandableNotes from "@/app/components/booking/BookingCardExpandableNotes";
import { formatIntegerRateDisplay } from "@/lib/bookingRate";
import { getProposalReviewSecondaryActionLabel, hasPendingRateProposal, type BookingRequest } from "@/lib/bookingRequests";

/** Shared proposal card shell for DM booking cards, Event Details lineup, and future proposal surfaces. */
export const BOOKING_PROPOSAL_CARD_SHELL_CLASS =
  "mt-2.5 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3";

const PROPOSAL_ACTIONS_ROW_CLASS = "mt-3 flex gap-2";

const PROPOSAL_PRIMARY_ACTION_CLASS =
  "ftc-btn-primary inline-flex min-h-8 min-w-0 flex-1 items-center justify-center px-3 py-2.5 text-xs uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50";

const PROPOSAL_SECONDARY_ACTION_CLASS =
  "inline-flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50";

export function BookingProposalCardShell({ children }: { children: ReactNode }) {
  return <div className={BOOKING_PROPOSAL_CARD_SHELL_CLASS}>{children}</div>;
}

export function BookingProposalCardAmount({ value }: { value: number | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-ftc-text-muted">Proposed rate</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ftc-text">
        {formatIntegerRateDisplay(value)}
      </p>
    </div>
  );
}

function ProposedRateNote({
  note,
  onNotesExpandedChange,
}: {
  note: string | null | undefined;
  onNotesExpandedChange?: (expanded: boolean) => void;
}) {
  const trimmed = note?.trim();

  if (!trimmed) {
    return null;
  }

  return (
    <div className="mt-1.5">
      <BookingCardExpandableNotes notes={trimmed} onNotesExpandedChange={onNotesExpandedChange} />
    </div>
  );
}

export default function BookingRateProposalPanel({
  booking,
  currentUserId,
  loading,
  onAcceptProposal,
  onKeepOriginalOffer,
  onNotesExpandedChange,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  loading?: boolean;
  onAcceptProposal: () => void | Promise<void>;
  onKeepOriginalOffer: () => void | Promise<void>;
  onNotesExpandedChange?: (expanded: boolean) => void;
}) {
  if (!hasPendingRateProposal(booking) || booking.sender_id !== currentUserId) {
    return null;
  }

  const secondaryActionLabel = getProposalReviewSecondaryActionLabel(booking);

  return (
    <BookingProposalCardShell>
      <BookingProposalCardAmount value={booking.proposed_rate} />
      <ProposedRateNote
        note={booking.proposed_rate_note}
        onNotesExpandedChange={onNotesExpandedChange}
      />

      <div className={PROPOSAL_ACTIONS_ROW_CLASS}>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onAcceptProposal()}
          className={PROPOSAL_PRIMARY_ACTION_CLASS}
        >
          Accept
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onKeepOriginalOffer()}
          className={PROPOSAL_SECONDARY_ACTION_CLASS}
        >
          {secondaryActionLabel}
        </button>
      </div>
    </BookingProposalCardShell>
  );
}

export function BookingRateProposalNotice({
  booking,
  currentUserId,
  onNotesExpandedChange,
}: {
  booking: BookingRequest;
  currentUserId: string | null;
  onNotesExpandedChange?: (expanded: boolean) => void;
}) {
  if (!hasPendingRateProposal(booking)) {
    return null;
  }

  const isRecipient = booking.recipient_id === currentUserId;

  if (isRecipient) {
    return (
      <BookingProposalCardShell>
        <BookingProposalCardAmount value={booking.proposed_rate} />
        <p className="mt-1 text-xs text-ftc-text-secondary">Pending review</p>
        <ProposedRateNote
          note={booking.proposed_rate_note}
          onNotesExpandedChange={onNotesExpandedChange}
        />
      </BookingProposalCardShell>
    );
  }

  if (booking.sender_id === currentUserId) {
    return (
      <BookingProposalCardShell>
        <BookingProposalCardAmount value={booking.proposed_rate} />
        <ProposedRateNote
          note={booking.proposed_rate_note}
          onNotesExpandedChange={onNotesExpandedChange}
        />
      </BookingProposalCardShell>
    );
  }

  return null;
}
