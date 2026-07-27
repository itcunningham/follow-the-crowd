import { formatIntegerRateDisplay } from "@/lib/bookingRate";

export const DM_BOOKING_PROPOSED_RATE_PREFIX = "Rate proposed: ";

export const DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE = "Original offer kept";

export const DM_BOOKING_RATE_DECLINED_MESSAGE = "Rate declined";

export const DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE = "Proposed rate accepted";

export const DM_BOOKING_CONFIRMED_MESSAGE = "Booking confirmed";

export const DM_BOOKING_CANCELLED_MESSAGE = "Booking cancelled";

export const DM_BOOKING_REQUEST_DECLINED_MESSAGE = "Booking request declined";

/** Prior concise system-message copy (still stored in some threads). */
const VERBOSE_PROPOSED_RATE_PREFIX = "DJ proposed a rate of ";

const VERBOSE_ORIGINAL_OFFER_KEPT_MESSAGE = "Planner kept the original offer.";

const VERBOSE_PROPOSED_RATE_ACCEPTED_MESSAGE = "Planner accepted the proposed rate.";

const VERBOSE_CONFIRMED_MESSAGE = "Booking confirmed.";

const VERBOSE_CANCELLED_MESSAGE = "Booking request cancelled.";

/** Legacy pill-style DM notices kept for historical threads. */
export const LEGACY_RATE_PROPOSED_DM_PREFIX = "Rate proposed ·";

export const LEGACY_RATE_PROPOSAL_DECLINED_DM_PREFIX = "Proposal declined ·";

export const LEGACY_RATE_PROPOSAL_DECLINED_DM_MESSAGE =
  "Proposal declined · original offer still available";

export const LEGACY_CANCELLED_BOOKING_DM_SYSTEM_MESSAGE =
  "Booking request cancelled by planner.";

export const LEGACY_BOOKING_ACCEPTED_DM_PREFIX = "Booking accepted ·";

export const LEGACY_BOOKING_CANCELLED_DM_PREFIX = "Booking cancelled ·";

export const LEGACY_BOOKING_ACTIVITY_DM_PREFIX = "BOOKING ACTIVITY ·";

/** @deprecated Use DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE */
export const DM_BOOKING_PLANNER_KEPT_ORIGINAL_OFFER_MESSAGE = DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE;

/** @deprecated Use DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE */
export const DM_BOOKING_PLANNER_ACCEPTED_PROPOSED_RATE_MESSAGE =
  DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE;

/** @deprecated Use DM_BOOKING_CANCELLED_MESSAGE */
export const DM_BOOKING_REQUEST_CANCELLED_MESSAGE = DM_BOOKING_CANCELLED_MESSAGE;

export function formatRateProposedDmSystemMessage(
  proposedRate: number | null | undefined,
): string {
  return `${DM_BOOKING_PROPOSED_RATE_PREFIX}${formatIntegerRateDisplay(proposedRate)}`;
}

/** @deprecated Use formatRateProposedDmSystemMessage */
export const formatDjProposedRateDmSystemMessage = formatRateProposedDmSystemMessage;

export function isLegacyRateProposedDmMessage(text: string): boolean {
  return text.trim().startsWith(LEGACY_RATE_PROPOSED_DM_PREFIX);
}

export function isLegacyRateProposalDeclinedDmMessage(text: string): boolean {
  return text.trim().startsWith(LEGACY_RATE_PROPOSAL_DECLINED_DM_PREFIX);
}

export function isLegacyBookingCancelledDmMessage(text: string): boolean {
  return text.trim().startsWith(LEGACY_BOOKING_CANCELLED_DM_PREFIX);
}

export function isLegacyBookingAcceptedDmMessage(text: string): boolean {
  return text.trim().startsWith(LEGACY_BOOKING_ACCEPTED_DM_PREFIX);
}

export function isLegacyBookingActivityDmMessage(text: string): boolean {
  return text.trim().startsWith(LEGACY_BOOKING_ACTIVITY_DM_PREFIX);
}

function isStoredProposedRateMessage(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith(DM_BOOKING_PROPOSED_RATE_PREFIX) ||
    trimmed.startsWith(VERBOSE_PROPOSED_RATE_PREFIX) ||
    isLegacyRateProposedDmMessage(trimmed)
  );
}

function isCanonicalDmBookingSystemMessage(text: string): boolean {
  const trimmed = text.trim();

  return (
    isStoredProposedRateMessage(trimmed) ||
    trimmed === DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE ||
    trimmed === VERBOSE_ORIGINAL_OFFER_KEPT_MESSAGE ||
    trimmed === DM_BOOKING_RATE_DECLINED_MESSAGE ||
    trimmed === DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE ||
    trimmed === VERBOSE_PROPOSED_RATE_ACCEPTED_MESSAGE ||
    trimmed === DM_BOOKING_CONFIRMED_MESSAGE ||
    trimmed === VERBOSE_CONFIRMED_MESSAGE ||
    trimmed === DM_BOOKING_CANCELLED_MESSAGE ||
    trimmed === VERBOSE_CANCELLED_MESSAGE ||
    trimmed === DM_BOOKING_REQUEST_DECLINED_MESSAGE
  );
}

export function isDmBookingSystemMessage(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  if (parseLegacyEventCancellationActivityEventName(trimmed)) {
    return false;
  }

  return (
    isCanonicalDmBookingSystemMessage(trimmed) ||
    isLegacyRateProposalDeclinedDmMessage(trimmed) ||
    isLegacyBookingCancelledDmMessage(trimmed) ||
    isLegacyBookingAcceptedDmMessage(trimmed) ||
    isLegacyBookingActivityDmMessage(trimmed) ||
    trimmed === LEGACY_CANCELLED_BOOKING_DM_SYSTEM_MESSAGE
  );
}

function parseStoredProposedRate(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed.startsWith(DM_BOOKING_PROPOSED_RATE_PREFIX)) {
    return trimmed.slice(DM_BOOKING_PROPOSED_RATE_PREFIX.length).trim() || null;
  }

  if (trimmed.startsWith(VERBOSE_PROPOSED_RATE_PREFIX)) {
    return trimmed.slice(VERBOSE_PROPOSED_RATE_PREFIX.length).replace(/\.$/, "").trim() || null;
  }

  if (isLegacyRateProposedDmMessage(trimmed)) {
    return trimmed.slice(LEGACY_RATE_PROPOSED_DM_PREFIX.length).trim() || null;
  }

  return null;
}

function parseLegacyBookingActivityAcceptedEventName(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^BOOKING ACTIVITY · accepted · (.+)$/i);

  return match?.[1]?.trim() || null;
}

function parseLegacyBookingActivityCancelledBookingId(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^BOOKING ACTIVITY · cancelled:([0-9a-f-]+)$/i);

  return match?.[1]?.trim() || null;
}

function parseLegacyEventCancellationActivityEventName(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^BOOKING ACTIVITY · event-cancelled · (.+)$/i);

  return match?.[1]?.trim() || null;
}

/** User-facing copy for booking timeline system messages in DM. */
export function formatDmBookingSystemMessageDisplay(text: string): string {
  const trimmed = text.trim();
  const proposedRate = parseStoredProposedRate(trimmed);

  if (proposedRate) {
    return `${DM_BOOKING_PROPOSED_RATE_PREFIX}${proposedRate}`;
  }

  if (
    trimmed === DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE ||
    trimmed === VERBOSE_ORIGINAL_OFFER_KEPT_MESSAGE ||
    trimmed === LEGACY_RATE_PROPOSAL_DECLINED_DM_MESSAGE ||
    isLegacyRateProposalDeclinedDmMessage(trimmed)
  ) {
    return DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE;
  }

  if (trimmed === DM_BOOKING_RATE_DECLINED_MESSAGE) {
    return DM_BOOKING_RATE_DECLINED_MESSAGE;
  }

  if (
    trimmed === DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE ||
    trimmed === VERBOSE_PROPOSED_RATE_ACCEPTED_MESSAGE
  ) {
    return DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE;
  }

  if (
    trimmed === DM_BOOKING_CONFIRMED_MESSAGE ||
    trimmed === VERBOSE_CONFIRMED_MESSAGE ||
    isLegacyBookingAcceptedDmMessage(trimmed) ||
    parseLegacyBookingActivityAcceptedEventName(trimmed)
  ) {
    return DM_BOOKING_CONFIRMED_MESSAGE;
  }

  if (trimmed === DM_BOOKING_REQUEST_DECLINED_MESSAGE) {
    return DM_BOOKING_REQUEST_DECLINED_MESSAGE;
  }

  if (
    trimmed === DM_BOOKING_CANCELLED_MESSAGE ||
    trimmed === VERBOSE_CANCELLED_MESSAGE ||
    trimmed === LEGACY_CANCELLED_BOOKING_DM_SYSTEM_MESSAGE ||
    isLegacyBookingCancelledDmMessage(trimmed) ||
    parseLegacyBookingActivityCancelledBookingId(trimmed)
  ) {
    return DM_BOOKING_CANCELLED_MESSAGE;
  }

  return trimmed;
}
