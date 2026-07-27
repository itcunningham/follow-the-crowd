import { formatIntegerRateDisplay } from "@/lib/bookingRate";

export const DM_BOOKING_PROPOSED_RATE_PREFIX = "DJ proposed a rate of ";

export const DM_BOOKING_PLANNER_KEPT_ORIGINAL_OFFER_MESSAGE =
  "Planner kept the original offer.";

export const DM_BOOKING_PLANNER_ACCEPTED_PROPOSED_RATE_MESSAGE =
  "Planner accepted the proposed rate.";

export const DM_BOOKING_CONFIRMED_MESSAGE = "Booking confirmed.";

export const DM_BOOKING_REQUEST_CANCELLED_MESSAGE = "Booking request cancelled.";

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

export function formatDjProposedRateDmSystemMessage(
  proposedRate: number | null | undefined,
): string {
  return `${DM_BOOKING_PROPOSED_RATE_PREFIX}${formatIntegerRateDisplay(proposedRate)}.`;
}

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

function isCanonicalDmBookingSystemMessage(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith(DM_BOOKING_PROPOSED_RATE_PREFIX) ||
    trimmed === DM_BOOKING_PLANNER_KEPT_ORIGINAL_OFFER_MESSAGE ||
    trimmed === DM_BOOKING_PLANNER_ACCEPTED_PROPOSED_RATE_MESSAGE ||
    trimmed === DM_BOOKING_CONFIRMED_MESSAGE ||
    trimmed === DM_BOOKING_REQUEST_CANCELLED_MESSAGE
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
    isLegacyRateProposedDmMessage(trimmed) ||
    isLegacyRateProposalDeclinedDmMessage(trimmed) ||
    isLegacyBookingCancelledDmMessage(trimmed) ||
    isLegacyBookingAcceptedDmMessage(trimmed) ||
    isLegacyBookingActivityDmMessage(trimmed) ||
    trimmed === LEGACY_CANCELLED_BOOKING_DM_SYSTEM_MESSAGE
  );
}

function parseLegacyProposedRateDisplay(text: string): string | null {
  if (!isLegacyRateProposedDmMessage(text)) {
    return null;
  }

  const rate = text.trim().slice(LEGACY_RATE_PROPOSED_DM_PREFIX.length).trim();

  return rate || null;
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

  if (trimmed.startsWith(DM_BOOKING_PROPOSED_RATE_PREFIX)) {
    return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
  }

  if (
    trimmed === DM_BOOKING_PLANNER_KEPT_ORIGINAL_OFFER_MESSAGE ||
    trimmed === DM_BOOKING_PLANNER_ACCEPTED_PROPOSED_RATE_MESSAGE ||
    trimmed === DM_BOOKING_CONFIRMED_MESSAGE ||
    trimmed === DM_BOOKING_REQUEST_CANCELLED_MESSAGE
  ) {
    return trimmed;
  }

  const legacyProposedRate = parseLegacyProposedRateDisplay(trimmed);

  if (legacyProposedRate) {
    return `${DM_BOOKING_PROPOSED_RATE_PREFIX}${legacyProposedRate}.`;
  }

  if (
    trimmed === LEGACY_RATE_PROPOSAL_DECLINED_DM_MESSAGE ||
    isLegacyRateProposalDeclinedDmMessage(trimmed)
  ) {
    return DM_BOOKING_PLANNER_KEPT_ORIGINAL_OFFER_MESSAGE;
  }

  if (
    trimmed === LEGACY_CANCELLED_BOOKING_DM_SYSTEM_MESSAGE ||
    isLegacyBookingCancelledDmMessage(trimmed) ||
    parseLegacyBookingActivityCancelledBookingId(trimmed)
  ) {
    return DM_BOOKING_REQUEST_CANCELLED_MESSAGE;
  }

  if (
    isLegacyBookingAcceptedDmMessage(trimmed) ||
    parseLegacyBookingActivityAcceptedEventName(trimmed)
  ) {
    return DM_BOOKING_CONFIRMED_MESSAGE;
  }

  if (parseLegacyEventCancellationActivityEventName(trimmed)) {
    return DM_BOOKING_REQUEST_CANCELLED_MESSAGE;
  }

  return trimmed;
}
