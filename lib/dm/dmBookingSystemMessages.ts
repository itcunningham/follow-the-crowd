import { formatIntegerRateDisplay } from "@/lib/bookingRate";
// Type-only: erased at compile time, so this cannot create a runtime cycle
// with lib/bookingRequests.ts (which imports this module's copy helpers).
import type { BookingRequest } from "@/lib/bookingRequests";

export const DM_BOOKING_PROPOSED_RATE_PREFIX = "Rate proposed: ";

export const DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE = "Original offer kept";

export const DM_BOOKING_RATE_DECLINED_MESSAGE = "Rate declined";

export const DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE = "Proposed rate accepted";

export const DM_BOOKING_CONFIRMED_MESSAGE = "Booking confirmed";

export const DM_BOOKING_CANCELLED_MESSAGE = "Booking cancelled";

export const DM_RUN_SHEET_UPDATED_PREFIX = "Run sheet updated";

/**
 * Per-save run sheet notice, e.g.
 * "Run sheet updated · Warehouse Set · Stage: Back, Notes updated".
 *
 * Event name keeps each event distinct in a shared planner↔DJ thread.
 * The trailing segment describes *what* changed (not only the resulting
 * assignment), so notes-only or order-only saves stay readable.
 */
export function formatRunSheetUpdatedDmMessage(
  eventName: string,
  changeSummary?: string | null,
): string {
  const parts = [DM_RUN_SHEET_UPDATED_PREFIX];
  const trimmedEvent = eventName.trim();
  const trimmedChange = changeSummary?.trim() ?? "";

  if (trimmedEvent) {
    parts.push(trimmedEvent);
  }

  if (trimmedChange) {
    parts.push(trimmedChange);
  }

  return parts.join(" · ");
}

export function isRunSheetUpdatedDmMessage(text: string): boolean {
  return text.trim().startsWith(`${DM_RUN_SHEET_UPDATED_PREFIX}`);
}

const BOOKING_CONFIRMED_ID_SUFFIX =
  /^(.*) · ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Per-booking confirmed message, e.g.
 * "Booking confirmed · Warehouse Set · <booking-id>".
 *
 * The bare `DM_BOOKING_CONFIRMED_MESSAGE` constant is identical for every
 * booking, so a conversation-scoped dedupe on it allowed only ONE confirmation
 * per DM. Event name alone is still too coarse: a second invite to the same
 * named event (or a legacy "Booking accepted · <event>" row) made the insert
 * skip, so the planner kept the invite message as latest preview — authored by
 * themselves, never unread, no Messages badge. The booking id makes each
 * acceptance its own row. Display still strips down to "Booking confirmed".
 */
export function formatBookingConfirmedDmMessage(
  eventName: string,
  bookingId?: string | null,
): string {
  const trimmed = eventName.trim();
  const base = trimmed
    ? `${DM_BOOKING_CONFIRMED_MESSAGE} · ${trimmed}`
    : DM_BOOKING_CONFIRMED_MESSAGE;
  const id = bookingId?.trim();

  return id ? `${base} · ${id}` : base;
}

export function parseBookingConfirmedDmEventName(text: string): string | null {
  const trimmed = text.trim();
  const prefix = `${DM_BOOKING_CONFIRMED_MESSAGE} · `;

  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  const rest = trimmed.slice(prefix.length).trim();

  if (!rest) {
    return null;
  }

  const withBookingId = rest.match(BOOKING_CONFIRMED_ID_SUFFIX);

  if (withBookingId) {
    return withBookingId[1]?.trim() || null;
  }

  return rest;
}

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

/** True when this DM text is a booking-acceptance system notice. */
export function isBookingAcceptanceDmSystemMessage(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  return (
    trimmed === DM_BOOKING_CONFIRMED_MESSAGE ||
    trimmed === VERBOSE_CONFIRMED_MESSAGE ||
    parseBookingConfirmedDmEventName(trimmed) !== null ||
    isLegacyBookingAcceptedDmMessage(trimmed) ||
    Boolean(trimmed.match(/^BOOKING ACTIVITY · accepted · (.+)$/i))
  );
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
    parseBookingConfirmedDmEventName(trimmed) !== null ||
    trimmed === VERBOSE_CONFIRMED_MESSAGE ||
    trimmed === DM_BOOKING_CANCELLED_MESSAGE ||
    trimmed === VERBOSE_CANCELLED_MESSAGE ||
    trimmed === DM_BOOKING_REQUEST_DECLINED_MESSAGE ||
    isRunSheetUpdatedDmMessage(trimmed)
  );
}

/** The versioned per-booking lifecycle notices, all of which carry a trailing
 *  booking id and must never render as ordinary chat. */
export function isVersionedBookingLifecycleDmMessage(text: string): boolean {
  return /^Booking (?:confirmed|withdrawn|cancelled) · .+ · [0-9a-fA-F-]{36}$/.test(text.trim());
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
    // "Booking withdrawn · <event> · <bookingId>" is the DJ-withdrawal
    // counterpart of the confirmed/cancelled notices. Without this it is not
    // treated as a system message at all, so it renders as ordinary chat and
    // leaks the raw booking UUID into both the DM timeline and the Messages
    // inbox preview.
    isVersionedBookingLifecycleDmMessage(trimmed) ||
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
  const withEventId = trimmed.match(
    /^BOOKING ACTIVITY · event-cancelled:[0-9a-f-]+ · (.+)$/i,
  );

  if (withEventId?.[1]?.trim()) {
    return withEventId[1].trim();
  }

  const match = trimmed.match(/^BOOKING ACTIVITY · event-cancelled · (.+)$/i);

  return match?.[1]?.trim() || null;
}

/** Whole-event cancel activity notice (hidden in the DM timeline; drives card state). */
export function isEventCancellationDmActivityMessage(text: string): boolean {
  return parseLegacyEventCancellationActivityEventName(text) !== null;
}

/** User-facing copy for booking timeline system messages in DM. */
export function formatDmBookingSystemMessageDisplay(text: string): string {
  const trimmed = text.trim();

  // Versioned lifecycle rows are hidden from the DM timeline, but they are
  // still the newest `messages` row, so they remain the Messages inbox
  // preview -- which is what keeps that conversation ordered and unread
  // correctly. Only the label may be shown: the event name is redundant beside
  // the conversation name, and the trailing booking id is a raw UUID, which
  // must never be user-facing (FTC_WORKFLOW §7). One branch rather than three
  // so a future fourth verb cannot leak an id by being forgotten here.
  if (isVersionedBookingLifecycleDmMessage(trimmed)) {
    return trimmed.slice(0, trimmed.indexOf(" · "));
  }

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

  // Display stays on the concise canonical copy, including for the per-event
  // form: the event name exists on the stored row purely so each acceptance is a
  // distinct message and dedupe can identify the booking.
  if (
    trimmed === DM_BOOKING_CONFIRMED_MESSAGE ||
    parseBookingConfirmedDmEventName(trimmed) !== null ||
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

  // Keep the change summary — that's the useful part of the notice.
  if (isRunSheetUpdatedDmMessage(trimmed)) {
    return trimmed;
  }

  return trimmed;
}


/**
 * The booking id trailing a booking timeline notice, e.g.
 * "Booking confirmed · <event> · <bookingId>".
 *
 * Exists so a notification whose target message has since been hidden by
 * shouldSuppressDmBookingTimelineNotice (a newer notice supersedes it) can
 * still resolve to something visible: that booking's own card. The identity is
 * already encoded in the message -- no second notification system needed.
 */
export function parseDmBookingTimelineBookingId(text: string): string | null {
  const match = text
    .trim()
    .match(/·\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s*$/);

  return match?.[1] ?? null;
}

/** How long the in-DM lifecycle toast stays up before fading itself out. */
export const DM_BOOKING_LIFECYCLE_TOAST_MS = 5000;

/**
 * Temporary in-DM confirmation of a booking lifecycle transition.
 *
 * The lifecycle rows are hidden from the timeline, so a reader already sitting
 * in the thread would otherwise watch the booking card mutate in silence. This
 * is a transient notice only -- it adds no `messages` row, so it cannot affect
 * ordering, unread, or badges.
 *
 * Returns null when the current user is the one who acted (the card gives them
 * their own feedback) and for every non-reportable transition. `declined` is
 * deliberately silent: it writes no DM system message and its notification
 * points at /bookings, not the DM -- see CURRENT-STATE 2026-08-16.
 *
 * `actorDisplayName` is the DM's other participant, which in a 1:1 thread IS
 * the actor for all three cases -- no profile lookup needed.
 */
export function formatDmBookingLifecycleToast(
  booking: Pick<
    BookingRequest,
    "status" | "event_name" | "sender_id" | "recipient_id" | "cancelled_by"
  >,
  currentUserId: string | null,
  actorDisplayName: string,
): string | null {
  const name = actorDisplayName.trim();

  if (!currentUserId || !name) {
    return null;
  }

  // Accept and withdraw are the DJ's (recipient) actions -- the planner
  // (sender) is the one who needs telling. Cancel is the planner's, so it is
  // the DJ's turn.
  if (booking.status === "accepted") {
    return currentUserId === booking.sender_id ? `${name} accepted your booking` : null;
  }

  if (booking.status !== "cancelled" || !booking.cancelled_by) {
    return null;
  }

  if (booking.cancelled_by === booking.recipient_id) {
    if (currentUserId !== booking.sender_id) {
      return null;
    }

    const eventName = booking.event_name?.trim();

    return eventName ? `${name} withdrew from ${eventName}` : `${name} withdrew from your booking`;
  }

  if (booking.cancelled_by === booking.sender_id) {
    return currentUserId === booking.recipient_id ? `${name} cancelled your booking` : null;
  }

  return null;
}
