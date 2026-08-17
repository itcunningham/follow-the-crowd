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

/** One source for the trailing booking id so the versioned recogniser and
 *  parseDmBookingTimelineBookingId can never disagree about the shape. */
const BOOKING_LIFECYCLE_ID_SOURCE =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/**
 * The ONE internal shape every per-booking notice uses:
 * `<label> · <event name> · <bookingRequestId>`.
 *
 * The booking id is the whole point. A bare label ("Rate declined", "Original
 * offer kept", "Booking cancelled") is byte-identical for every booking in a
 * thread, so an exact-text dedupe returns SOME OTHER booking's row, the caller
 * threads that stale id into create_notification, and its (user_id, message_id)
 * dedupe swallows the legitimate notification -- no push at all. That is the
 * bug that broke withdrawal pushes for days.
 *
 * THROWS on a missing booking id rather than returning the bare label. A silent
 * degrade would hand back exactly the collision-prone non-unique form this
 * function exists to replace, and it would do so at the one moment nobody is
 * looking. `booking.id` is non-null on every caller's path, so this can only
 * fire on a programming error -- and every caller already runs inside a
 * try/catch or a soft-failing helper.
 *
 * Event name falls back to "Event" (same as formatBookingAcceptedDmMessage)
 * rather than emitting an empty middle segment: an empty segment does not match
 * the versioned recogniser, so the row would render as ordinary chat and put a
 * raw UUID in front of the user.
 */
export function formatVersionedBookingLifecycleDmMessage(
  label: string,
  eventName: string | null | undefined,
  bookingId: string | null | undefined,
): string {
  const trimmedLabel = label.trim();
  const trimmedId = bookingId?.trim();

  if (!trimmedId) {
    throw new Error(
      `Cannot version the DM notice "${trimmedLabel}" without a booking id -- the bare label is not unique per booking`,
    );
  }

  return `${trimmedLabel} · ${eventName?.trim() || "Event"} · ${trimmedId}`;
}

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

/** The bare display/legacy label, e.g. "Rate proposed: $500". Not an identity --
 *  use formatVersionedRateProposedDmMessage for anything stored. */
export function formatRateProposedDmSystemMessage(
  proposedRate: number | null | undefined,
): string {
  return `${DM_BOOKING_PROPOSED_RATE_PREFIX}${formatIntegerRateDisplay(proposedRate)}`;
}

/**
 * `Rate proposed: $500 · <event> · <bookingId>` -- the STORED form.
 *
 * The rate alone is not an identity: two bookings in one planner<->DJ thread
 * can be offered the same figure, and the same figure can be re-proposed after
 * a decline. Versioning it keeps the dedupe (and therefore the deep-link
 * target) per booking, and lets the row resolve to its own booking card via
 * parseDmBookingTimelineBookingId. Display still shows "Rate proposed: $X".
 */
export function formatVersionedRateProposedDmMessage(
  proposedRate: number | null | undefined,
  eventName: string | null | undefined,
  bookingId: string | null | undefined,
): string {
  return formatVersionedBookingLifecycleDmMessage(
    formatRateProposedDmSystemMessage(proposedRate),
    eventName,
    bookingId,
  );
}

/** `Proposed rate accepted · <event> · <bookingId>`. */
export function formatProposedRateAcceptedDmMessage(
  eventName: string | null | undefined,
  bookingId: string | null | undefined,
): string {
  return formatVersionedBookingLifecycleDmMessage(
    DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE,
    eventName,
    bookingId,
  );
}

/**
 * `Rate declined · <event> · <bookingId>` or
 * `Original offer kept · <event> · <bookingId>`.
 *
 * Both labels are bare non-unique constants; this is the pair whose collision
 * the versioned form exists to prevent.
 */
export function formatRateProposalDeclinedDmMessage(
  label: string,
  eventName: string | null | undefined,
  bookingId: string | null | undefined,
): string {
  return formatVersionedBookingLifecycleDmMessage(label, eventName, bookingId);
}

/**
 * LIKE pattern selecting exactly one booking's stored rate-proposal rows.
 *
 * Anchored at BOTH ends -- the label prefix and this booking's own id -- so it
 * cannot match another booking's proposal, a decline notice, or ordinary chat.
 * That is the opposite of the unanchored prefix match that let one booking's
 * notice suppress another's push: the wildcard sits only where the rate lives.
 */
export function buildVersionedRateProposedDmMessageLikePattern(bookingId: string): string {
  return `${DM_BOOKING_PROPOSED_RATE_PREFIX}%· ${bookingId.trim()}`;
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

function buildVersionedNoticePattern(labelAlternation: string): RegExp {
  return new RegExp(`^(?:${labelAlternation}) · .+ · ${BOOKING_LIFECYCLE_ID_SOURCE}$`);
}

/**
 * Lifecycle STATE verbs. These are audit lines for state the booking card
 * already shows, so they are hidden from the DM timeline (shipped f5b4cbd9).
 */
const VERSIONED_BOOKING_LIFECYCLE_LABELS = [
  DM_BOOKING_CONFIRMED_MESSAGE,
  "Booking withdrawn",
  DM_BOOKING_CANCELLED_MESSAGE,
] as const;

/**
 * NEGOTIATION labels. Deliberately NOT in the list above.
 *
 * These are conversation history, not lifecycle audit noise: "Rate proposed:
 * $500 / Rate declined / Rate proposed: $600" is the record of how a booking got
 * to its price, and the card only ever shows the current state -- both
 * BookingRateProposalPanel and BookingRateProposalNotice render nothing once no
 * proposal is pending, so hiding these rows erases the negotiation (and its
 * proposed_rate_note) with nothing taking its place. They stay VISIBLE; only
 * the internal `· <event> · <bookingId>` identity suffix is stripped for
 * display. Product decision, measured: hiding them left an accepted $600
 * booking showing nothing at all.
 */
const VERSIONED_RATE_PROPOSAL_LABELS = [
  DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE,
  DM_BOOKING_RATE_DECLINED_MESSAGE,
  DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE,
] as const;

const VERSIONED_BOOKING_LIFECYCLE_PATTERN = buildVersionedNoticePattern(
  VERSIONED_BOOKING_LIFECYCLE_LABELS.join("|"),
);

const VERSIONED_RATE_PROPOSAL_PATTERN = buildVersionedNoticePattern(
  // `Rate proposed: $X` embeds the rate in its label, so it is matched by
  // prefix + "no separator until the first · " rather than as a fixed string.
  `${VERSIONED_RATE_PROPOSAL_LABELS.join("|")}|${DM_BOOKING_PROPOSED_RATE_PREFIX}[^·]+`,
);

/** The versioned per-booking lifecycle notices -- the three state verbs, which
 *  the booking card already reflects and which are hidden from the timeline. */
export function isVersionedBookingLifecycleDmMessage(text: string): boolean {
  return VERSIONED_BOOKING_LIFECYCLE_PATTERN.test(text.trim());
}

/** The versioned per-booking negotiation notices. Visible in the timeline; only
 *  their identity suffix is stripped for display. */
export function isVersionedRateProposalDmMessage(text: string): boolean {
  return VERSIONED_RATE_PROPOSAL_PATTERN.test(text.trim());
}

/** Any notice carrying the internal `· <event> · <bookingId>` identity, whether
 *  it renders or not. Drives display stripping and system-message
 *  classification -- never visibility. */
export function isVersionedBookingIdentityDmMessage(text: string): boolean {
  return isVersionedBookingLifecycleDmMessage(text) || isVersionedRateProposalDmMessage(text);
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
    // ...and the versioned negotiation notices for the same reason: they stay
    // VISIBLE, but as system notices whose identity suffix is stripped, not as
    // ordinary chat carrying a raw UUID.
    isVersionedBookingIdentityDmMessage(trimmed) ||
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

  // Every versioned row -- hidden lifecycle verb or VISIBLE negotiation notice --
  // carries an internal `· <event> · <bookingId>` identity that exists purely so
  // dedupe and push targeting can tell one booking from another. None of it may
  // be user-facing: the event name is redundant beside the conversation name,
  // and the booking id is a raw UUID (FTC_WORKFLOW §7). Slicing at the first
  // " · " leaves exactly the readable label -- "Booking withdrawn", "Rate
  // proposed: $500", "Rate declined", "Original offer kept". One branch rather
  // than one per label, so a newly versioned notice cannot leak an id by being
  // forgotten here.
  //
  // Note this is display only. Hidden rows are still the newest `messages` row
  // and still supply the inbox preview, its timestamp and its author -- which is
  // what keeps the conversation ordered and unread correctly.
  if (isVersionedBookingIdentityDmMessage(trimmed)) {
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


const DM_BOOKING_TIMELINE_TRAILING_ID_PATTERN = new RegExp(
  `·\\s*(${BOOKING_LIFECYCLE_ID_SOURCE})\\s*$`,
);

/**
 * The booking id trailing a booking timeline notice, e.g.
 * "Booking confirmed · <event> · <bookingId>".
 *
 * Exists so a notification whose target message is not rendered -- every
 * versioned lifecycle row is hidden, and a superseded notice is suppressed --
 * can still resolve to something visible: that booking's own card. The identity
 * is already encoded in the message -- no second notification system needed.
 */
export function parseDmBookingTimelineBookingId(text: string): string | null {
  // Structural, not label-driven: it recognises the trailing `· <bookingId>`
  // segment of ANY versioned lifecycle notice, so the four rate-proposal
  // formats added alongside the confirmed/withdrawn/cancelled three needed no
  // change here. Sharing BOOKING_LIFECYCLE_ID_SOURCE with the versioned
  // recogniser is what guarantees a hidden row always yields a fallback id.
  const match = text.trim().match(DM_BOOKING_TIMELINE_TRAILING_ID_PATTERN);

  return match?.[1] ?? null;
}

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
 * deliberately silent: it writes no DM system message of its own -- its push now
 * deep-links to the booking-request card that already exists in the thread, so
 * there is nothing extra to announce in-thread.
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

type DmBookingLifecycleBooking = Pick<
  BookingRequest,
  "id" | "status" | "event_name" | "sender_id" | "recipient_id" | "cancelled_by"
>;

/**
 * The per-booking identity a lifecycle transition is detected against.
 *
 * `cancelled_by` is load-bearing, not decoration. A DJ withdrawal and a planner
 * cancellation are BOTH `status: "cancelled"`, so a status-only signature makes
 * them indistinguishable -- one replacing the other yields no detected change
 * and therefore no toast, which is precisely the path the live "planner
 * cancelled" verification exercises. Keyed by id so an unrelated column change
 * (rate proposal fields, hide flags) leaves the signature identical.
 */
export function buildDmBookingLifecycleSignatures(
  bookings: readonly DmBookingLifecycleBooking[],
): Map<string, string> {
  return new Map(
    bookings.map((booking) => [
      booking.id,
      `${booking.status}:${booking.cancelled_by ?? ""}`,
    ]),
  );
}

/**
 * The toast for the first reportable transition between two signature
 * snapshots, or null.
 *
 * A null `previousSignatures` means this is the first snapshot: it only seeds
 * the map, so opening a DM onto an already-accepted booking says nothing. An id
 * absent from the previous snapshot is a booking seen for the first time, not a
 * transition. Whatever survives both gates still has to get past
 * formatDmBookingLifecycleToast, which drops anything the current user did.
 */
export function pickDmBookingLifecycleToast(options: {
  previousSignatures: Map<string, string> | null;
  nextSignatures: Map<string, string>;
  bookings: readonly DmBookingLifecycleBooking[];
  currentUserId: string | null;
  actorDisplayName: string;
}): string | null {
  const { previousSignatures, nextSignatures, bookings } = options;

  if (!previousSignatures || !options.currentUserId) {
    return null;
  }

  for (const booking of bookings) {
    const previousSignature = previousSignatures.get(booking.id);

    if (
      previousSignature === undefined ||
      previousSignature === nextSignatures.get(booking.id)
    ) {
      continue;
    }

    const toast = formatDmBookingLifecycleToast(
      booking,
      options.currentUserId,
      options.actorDisplayName,
    );

    if (toast) {
      return toast;
    }
  }

  return null;
}
