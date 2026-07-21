import { supabase } from "@/lib/supabaseClient";
import {
  isDateKeyBeforeToday,
  parseEventDate,
  resolveEventDateKey,
} from "@/lib/bookingDateTime";
import { createNotification, getNotificationCreateErrorMessage, notifyNavigationBadgesRefresh } from "@/lib/notifications";
import { formatRateDisplay, formatIntegerRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import { startDm } from "@/lib/startDm";
import {
  FTC_STATUS_DANGER,
  FTC_STATUS_MUTED,
  FTC_STATUS_PENDING,
  FTC_STATUS_SUCCESS,
  FTC_STATUS_WARNING,
} from "@/lib/ftcFlatStatus";
import { getCurrentUserId, getUserAvatarProfilesByIds, type BookingRecipientProfile } from "@/lib/user/currentUser";
import { countAcceptedCrewDjsForEvent } from "@/lib/events/crewChatUnlock";
import { postBookingCancellationGroupChatUpdate } from "@/lib/events/bookingCancellation";
import { postBookingAcceptanceGroupChatUpdate } from "@/lib/events/bookingAcceptance";

export type BookingRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type BookingRateMode = "fixed" | "open";

export type ProposedRateStatus = "pending" | "accepted" | "declined";

export type BookingRequestInput = {
  eventName: string;
  venue: string;
  eventDate: string;
  setTime: string;
  fee: string;
  notes: string;
  eventId?: string;
  rateMode?: BookingRateMode;
};

export type BookingSendFailure = {
  recipientId: string;
  message: string;
};

export type BookingCampaignStats = {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  cancelled: number;
};

export type BookingStatusFilter = "all" | "pending" | "accepted" | "declined" | "cancelled";

export type ActiveBookingStatusFilter = "all" | "pending" | "accepted" | "declined";

export type PlannerSentBookingsView = "active" | "history" | "archived";

export type DjGigsListTab = "pending" | "accepted" | "history";

/** @deprecated Legacy URL values; normalized via parseDjGigsListTab. */
export type DjGigsViewFilter = DjGigsListTab | "declined" | "calendar";

export type SentBookingGroup = {
  key: string;
  event_name: string;
  venue: string;
  event_date: string;
  set_time: string;
  fee: string;
  notes: string;
  created_at: string;
  requests: BookingRequest[];
};

export type BookingRequest = {
  id: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string;
  event_id: string | null;
  event_name: string;
  venue: string;
  event_date: string;
  set_time: string;
  fee: string;
  notes: string;
  status: BookingRequestStatus;
  archived_at: string | null;
  lineup_hidden_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  rate_mode: BookingRateMode;
  proposed_rate: number | null;
  proposed_rate_note: string | null;
  proposed_rate_at: string | null;
  proposed_rate_status: ProposedRateStatus | null;
};

export type AcceptedBookingCancellationRole = "planner" | "dj";

export const PLANNER_CANCELLATION_REASONS = [
  "Lineup change",
  "Event changes",
  "Booking made in error",
  "Other",
] as const;

export const DJ_WITHDRAWAL_REASONS = [
  "Unavailable",
  "Illness",
  "Scheduling conflict",
  "Other",
] as const;

function formatStatusLabel(status: BookingRequestStatus): string {
  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "declined") {
    return "Declined";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Pending";
}

export function getAcceptedBookingCancellationRole(
  booking: BookingRequest,
  currentUserId: string | null,
): AcceptedBookingCancellationRole | null {
  if (!currentUserId || booking.status !== "accepted") {
    return null;
  }

  if (booking.sender_id === currentUserId) {
    return "planner";
  }

  if (booking.recipient_id === currentUserId) {
    return "dj";
  }

  return null;
}

export function formatPublicCancellationReason(reason: string): string {
  const trimmed = reason.trim();

  if (trimmed === "Illness") {
    return "Unavailable";
  }

  return trimmed;
}

export function resolveBookingCancellationReasonLabel(
  booking: BookingRequest,
): string | null {
  if (booking.status !== "cancelled" || !booking.cancellation_reason?.trim()) {
    return null;
  }

  return formatPublicCancellationReason(booking.cancellation_reason);
}

export function resolveBookingCancelledByLabel(
  booking: BookingRequest,
  profiles: Map<string, BookingRecipientProfile>,
): string | null {
  if (booking.status !== "cancelled" || !booking.cancelled_by?.trim()) {
    return null;
  }

  if (booking.cancelled_by === booking.sender_id) {
    return "Planner";
  }

  if (booking.cancelled_by === booking.recipient_id) {
    return profiles.get(booking.recipient_id)?.display_name?.trim() || "DJ";
  }

  return profiles.get(booking.cancelled_by)?.display_name?.trim() || "Member";
}

export function canCancelBookingRequest(
  booking: BookingRequest,
  currentUserId: string | null,
): boolean {
  return (
    Boolean(currentUserId) &&
    booking.sender_id === currentUserId &&
    booking.status === "pending"
  );
}

export function getBookingStatusBadgeClass(status: BookingRequestStatus): string {
  if (status === "accepted") {
    return FTC_STATUS_SUCCESS;
  }

  if (status === "declined") {
    return FTC_STATUS_DANGER;
  }

  if (status === "cancelled") {
    return FTC_STATUS_MUTED;
  }

  return FTC_STATUS_WARNING;
}

export function getBookingCancelledDmBadgeClass(): string {
  return "inline-flex shrink-0 rounded-full border border-[var(--ftc-color-danger)]/35 bg-[var(--ftc-color-danger)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ftc-color-danger)]";
}

export function getBookingCancelledDmCardClass(): string {
  return "border border-[var(--ftc-color-danger)]/35 bg-[var(--ftc-color-danger)]/5";
}

export function isBookingAffectedByCancelledEvent(
  booking: BookingRequest,
  eventCancelled: boolean,
): boolean {
  if (!eventCancelled) {
    return false;
  }

  return booking.status === "accepted" || booking.status === "pending";
}

export function getEventCancelledBookingLabel(
  booking: BookingRequest,
  currentUserId: string | null,
): string {
  if (currentUserId === booking.sender_id) {
    return "Event cancelled";
  }

  return "Event cancelled by planner";
}

export function isActiveBookingStatus(status: BookingRequestStatus): boolean {
  return status !== "cancelled";
}

export function filterActiveBookings(bookings: BookingRequest[]): BookingRequest[] {
  return bookings.filter((booking) => isActiveBookingStatus(booking.status));
}

export function filterVisibleEventLineupBookings(bookings: BookingRequest[]): BookingRequest[] {
  return bookings.filter(
    (booking) => booking.status !== "declined" || !booking.lineup_hidden_at,
  );
}

export function filterCancelledBookings(bookings: BookingRequest[]): BookingRequest[] {
  return bookings.filter((booking) => booking.status === "cancelled");
}

export function isDjGigPastAccepted(booking: BookingRequest): boolean {
  if (booking.status !== "accepted") {
    return false;
  }

  const dateKey = resolveBookingDateKey(booking.event_date);

  return dateKey ? isDateKeyBeforeToday(dateKey) : false;
}

export function isDjGigHistoryBooking(booking: BookingRequest): boolean {
  return (
    booking.status === "declined" ||
    booking.status === "cancelled" ||
    isDjGigPastAccepted(booking)
  );
}

export function sortGigsByEventDateAsc(bookings: BookingRequest[]): BookingRequest[] {
  return [...bookings].sort((left, right) => {
    const leftKey = resolveBookingDateKey(left.event_date) ?? "9999-12-31";
    const rightKey = resolveBookingDateKey(right.event_date) ?? "9999-12-31";

    if (leftKey !== rightKey) {
      return leftKey.localeCompare(rightKey);
    }

    return left.event_name.localeCompare(right.event_name);
  });
}

export function filterDjGigsByTab(
  bookings: BookingRequest[],
  tab: DjGigsListTab,
  hiddenBookingIds: ReadonlySet<string> = new Set(),
): BookingRequest[] {
  switch (tab) {
    case "pending":
      return bookings.filter((booking) => booking.status === "pending");
    case "accepted":
      return sortGigsByEventDateAsc(
        bookings.filter(
          (booking) => booking.status === "accepted" && !isDjGigPastAccepted(booking),
        ),
      );
    case "history":
      return sortBookingsNewestFirst(
        bookings.filter(
          (booking) =>
            isDjGigHistoryBooking(booking) &&
            !isBookingHiddenFromUserHistory(booking.id, hiddenBookingIds),
        ),
      );
  }
}

export function countDjGigsByTab(
  bookings: BookingRequest[],
  hiddenBookingIds: ReadonlySet<string> = new Set(),
): Record<DjGigsListTab, number> {
  return {
    pending: filterDjGigsByTab(bookings, "pending", hiddenBookingIds).length,
    accepted: filterDjGigsByTab(bookings, "accepted", hiddenBookingIds).length,
    history: filterDjGigsByTab(bookings, "history", hiddenBookingIds).length,
  };
}

export function isArchivedBooking(booking: BookingRequest): boolean {
  return Boolean(booking.archived_at);
}

export function isBookingHiddenFromUserHistory(
  bookingId: string,
  hiddenBookingIds: ReadonlySet<string>,
): boolean {
  return hiddenBookingIds.has(bookingId);
}

export function filterHistoryCancelledBookings(
  bookings: BookingRequest[],
  hiddenBookingIds: ReadonlySet<string> = new Set(),
): BookingRequest[] {
  return sortBookingsNewestFirst(
    bookings.filter(
      (booking) =>
        booking.status === "cancelled" &&
        !booking.archived_at &&
        !isBookingHiddenFromUserHistory(booking.id, hiddenBookingIds),
    ),
  );
}

export function filterArchivedCancelledBookings(bookings: BookingRequest[]): BookingRequest[] {
  return sortBookingsNewestFirst(
    bookings.filter((booking) => booking.status === "cancelled" && Boolean(booking.archived_at)),
  );
}

function normalizeBookingRequestStatus(value: unknown): BookingRequestStatus {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === "accepted" ||
      normalized === "declined" ||
      normalized === "cancelled" ||
      normalized === "pending"
    ) {
      return normalized;
    }
  }

  return "pending";
}

function normalizeBookingRateMode(value: unknown): BookingRateMode {
  if (typeof value === "string" && value.trim().toLowerCase() === "open") {
    return "open";
  }

  return "fixed";
}

export function resolveBookingRequestRateMode(input: BookingRequestInput): BookingRateMode {
  const legacyRateMode = (input as BookingRequestInput & { rate_mode?: unknown }).rate_mode;

  return normalizeBookingRateMode(input.rateMode ?? legacyRateMode);
}

const IS_DEV = process.env.NODE_ENV === "development";

function assertInsertedBookingRateMode(
  requestedRateMode: BookingRateMode,
  booking: BookingRequest,
): void {
  if (!IS_DEV || booking.rate_mode === requestedRateMode) {
    return;
  }

  throw new Error(
    `Booking insert rate_mode mismatch: requested "${requestedRateMode}" but database returned "${booking.rate_mode}". Run scripts/supabaseReloadPostgrest.sql in the Supabase SQL Editor.`,
  );
}

function normalizeProposedRateStatus(value: unknown): ProposedRateStatus | null {
  if (value === "pending" || value === "accepted" || value === "declined") {
    return value;
  }

  return null;
}

function normalizeProposedRate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function hasPendingRateProposal(booking: BookingRequest): boolean {
  return (
    booking.status === "pending" &&
    booking.proposed_rate_status === "pending" &&
    booking.proposed_rate != null &&
    booking.proposed_rate > 0
  );
}

export function hasDeclinedRateProposal(booking: BookingRequest): boolean {
  return (
    booking.status === "pending" &&
    booking.rate_mode === "open" &&
    booking.proposed_rate_status === "declined"
  );
}

export function canProposeBookingRate(
  booking: BookingRequest,
  currentUserId: string | null,
): boolean {
  return (
    Boolean(currentUserId) &&
    booking.recipient_id === currentUserId &&
    booking.status === "pending" &&
    booking.rate_mode === "open" &&
    !hasPendingRateProposal(booking) &&
    (booking.proposed_rate_status == null || booking.proposed_rate_status === "declined")
  );
}

export function canRecipientRespondToPendingBooking(
  booking: BookingRequest,
  currentUserId: string | null,
): boolean {
  if (normalizeBookingRequestStatus(booking.status) !== "pending" || !booking.id?.trim()) {
    return false;
  }

  return Boolean(currentUserId && booking.recipient_id === currentUserId);
}

function parseOfferTypeFromMessage(value: string | null | undefined): BookingRateMode | null {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("open")) {
    return "open";
  }

  if (normalized.includes("fixed")) {
    return "fixed";
  }

  return null;
}

export function canRespondToRateProposal(
  booking: BookingRequest,
  currentUserId: string | null,
): boolean {
  return (
    Boolean(currentUserId) &&
    booking.sender_id === currentUserId &&
    booking.status === "pending" &&
    hasPendingRateProposal(booking)
  );
}

export function getBookingOfferRateLabel(booking: BookingRequest): string {
  if (booking.rate_mode === "open") {
    const formatted = formatRateDisplay(booking.fee);

    return formatted === "$" ? "Ask for rate" : formatted;
  }

  return formatRateDisplay(booking.fee);
}

export function getBookingRateDetailLabel(booking: BookingRequest): string {
  if (booking.status === "accepted") {
    return "Rate";
  }

  if (booking.rate_mode === "open") {
    return hasPendingRateProposal(booking) ? "Offered rate" : "Suggested rate";
  }

  return "Rate";
}

export function getBookingCollapsedOfferSummary(booking: BookingRequest): string {
  return getDmBookingCardOfferSummary(booking);
}

/** Offer copy for booking cards inside Messages (collapsed + expanded). */
export function getDmBookingCardOfferSummary(booking: BookingRequest): string {
  if (booking.rate_mode === "open") {
    const feeLabel = getBookingOfferRateLabel(booking);

    if (feeLabel === "Ask for rate") {
      return "Open offer";
    }

    return `Open · ${feeLabel}`;
  }

  return `Fixed · ${getBookingOfferRateLabel(booking)}`;
}

/** Gigs list card copy — shorter labels; does not affect DM or other surfaces. */
export function getGigCardOfferSummary(booking: BookingRequest): string {
  if (booking.rate_mode === "open") {
    return "Open offer";
  }

  return `Fixed · ${getBookingOfferRateLabel(booking)}`;
}

export function getBookingCollapsedUrgentLabel(
  booking: BookingRequest,
  currentUserId: string | null,
  options?: { canRespond?: boolean; bookingLoaded?: boolean },
): string | null {
  if (!options?.bookingLoaded) {
    return null;
  }

  if (canRespondToRateProposal(booking, currentUserId)) {
    return "Rate proposed";
  }

  return null;
}

/** True when a DM booking message should render the full interactive card (pending / awaiting action). */
export function isDmBookingActionRequired(
  booking: BookingRequest,
  eventCancelled = false,
): boolean {
  if (isBookingAffectedByCancelledEvent(booking, eventCancelled)) {
    return false;
  }

  return normalizeBookingRequestStatus(booking.status) === "pending";
}

export function normalizeBookingRequest(row: unknown): BookingRequest | null {
  if (typeof row === "string") {
    try {
      return normalizeBookingRequest(JSON.parse(row) as unknown);
    } catch (parseError) {
      console.error("[bookings] Failed to parse booking request JSON:", row, parseError);
      return null;
    }
  }

  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;

  if (!id) {
    return null;
  }

  return {
    id,
    created_at:
      typeof record.created_at === "string" ? record.created_at : new Date().toISOString(),
    sender_id: typeof record.sender_id === "string" ? record.sender_id : "",
    recipient_id: typeof record.recipient_id === "string" ? record.recipient_id : "",
    conversation_id: typeof record.conversation_id === "string" ? record.conversation_id : "",
    event_id: typeof record.event_id === "string" ? record.event_id : null,
    event_name: typeof record.event_name === "string" ? record.event_name : "",
    venue: typeof record.venue === "string" ? record.venue : "",
    event_date: typeof record.event_date === "string" ? record.event_date : "",
    set_time: typeof record.set_time === "string" ? record.set_time : "",
    fee: typeof record.fee === "string" ? record.fee : "",
    notes: typeof record.notes === "string" ? record.notes : "",
    status: normalizeBookingRequestStatus(record.status),
    archived_at: typeof record.archived_at === "string" ? record.archived_at : null,
    lineup_hidden_at:
      typeof record.lineup_hidden_at === "string" ? record.lineup_hidden_at : null,
    cancelled_at: typeof record.cancelled_at === "string" ? record.cancelled_at : null,
    cancelled_by: typeof record.cancelled_by === "string" ? record.cancelled_by : null,
    cancellation_reason:
      typeof record.cancellation_reason === "string" ? record.cancellation_reason : null,
    rate_mode: normalizeBookingRateMode(record.rate_mode),
    proposed_rate: normalizeProposedRate(record.proposed_rate),
    proposed_rate_note:
      typeof record.proposed_rate_note === "string" ? record.proposed_rate_note : null,
    proposed_rate_at:
      typeof record.proposed_rate_at === "string" ? record.proposed_rate_at : null,
    proposed_rate_status: normalizeProposedRateStatus(record.proposed_rate_status),
  };
}

export function mapBookingRequestRows(rows: unknown[] | null | undefined): BookingRequest[] {
  return (rows ?? [])
    .map(normalizeBookingRequest)
    .filter((booking): booking is BookingRequest => booking !== null);
}

export function logCancelledBookingsLoadFailure(
  context: string,
  bookings: BookingRequest[],
  expectedBookingId?: string,
): void {
  const cancelled = filterCancelledBookings(bookings);

  if (expectedBookingId && !cancelled.some((booking) => booking.id === expectedBookingId)) {
    console.error(`[bookings] Cancelled booking failed to load (${context}):`, {
      expectedBookingId,
      cancelledCount: cancelled.length,
      bookingStatuses: bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
      })),
    });
  }
}

export function sortBookingsNewestFirst(bookings: BookingRequest[]): BookingRequest[] {
  return [...bookings].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

export function getCancelledBookingsFromGroups(groups: SentBookingGroup[]): BookingRequest[] {
  return sortBookingsNewestFirst(filterCancelledBookings(getAllBookingsFromGroups(groups)));
}

export function getAllBookingsFromGroups(groups: SentBookingGroup[]): BookingRequest[] {
  return groups.flatMap((group) => group.requests);
}

export function filterActiveBookingGroups(
  groups: SentBookingGroup[],
  filter: ActiveBookingStatusFilter,
): SentBookingGroup[] {
  const activeGroups = groups
    .map((group) => ({
      ...group,
      requests: group.requests.filter((request) => isActiveBookingStatus(request.status)),
    }))
    .filter((group) => group.requests.length > 0);

  if (filter === "all") {
    return activeGroups;
  }

  return activeGroups
    .map((group) => ({
      ...group,
      requests: group.requests.filter((request) => request.status === filter),
    }))
    .filter((group) => group.requests.length > 0);
}

export function getActiveBookingCampaignStats(group: SentBookingGroup): BookingCampaignStats {
  return getBookingCampaignStats({
    ...group,
    requests: group.requests.filter((request) => isActiveBookingStatus(request.status)),
  });
}

export function formatBookingRequestMessage(booking: BookingRequest): string {
  const lines = [
    "BOOKING REQUEST",
    `Booking ID: ${booking.id}`,
    `Event: ${booking.event_name}`,
    `Venue: ${booking.venue}`,
    `Date: ${booking.event_date}`,
    `Set time: ${booking.set_time}`,
    `Offer type: ${booking.rate_mode === "open" ? "Ask for rate" : "Fixed offer"}`,
    `Rate: ${formatRateDisplay(booking.fee)}`,
    `Notes: ${booking.notes || "None"}`,
    `Status: ${formatStatusLabel(booking.status)}`,
  ];

  if (booking.status === "cancelled") {
    if (booking.cancelled_by) {
      lines.push(`Cancelled by: ${booking.cancelled_by}`);
    }

    if (booking.cancellation_reason?.trim()) {
      lines.push(`Cancellation reason: ${booking.cancellation_reason.trim()}`);
    }
  }

  return lines.join("\n");
}

export function parseBookingRequestMessage(text: string): {
  bookingId: string | null;
  eventName: string | null;
  venue: string | null;
  eventDate: string | null;
  setTime: string | null;
  offerType: string | null;
  fee: string | null;
  notes: string | null;
  status: BookingRequestStatus | null;
} | null {
  if (!text.trim().startsWith("BOOKING REQUEST")) {
    return null;
  }

  const lines = text.split("\n");
  const values: Record<string, string> = {};

  for (const line of lines.slice(1)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  const statusValue = values.status?.toLowerCase();
  const status: BookingRequestStatus | null =
    statusValue === "accepted" ||
    statusValue === "declined" ||
    statusValue === "pending" ||
    statusValue === "cancelled"
      ? statusValue
      : null;

  return {
    bookingId: values["booking id"]?.trim() || null,
    eventName: values.event ?? null,
    venue: values.venue ?? null,
    eventDate: values.date ?? null,
    setTime: values["set time"] ?? null,
    offerType: values["offer type"] ?? null,
    fee: normalizeStoredRate(values.rate ?? values.fee ?? "") || null,
    notes: values.notes ?? null,
    status,
  };
}

export function isBookingRequestMessage(text: string): boolean {
  return text.trim().startsWith("BOOKING REQUEST");
}

export const CANCELLED_BOOKING_DM_SYSTEM_MESSAGE =
  "Booking request cancelled by planner.";

export const RATE_PROPOSED_DM_PREFIX = "Rate proposed ·";

const RATE_PROPOSED_DM_DUPLICATE_WINDOW_MS = 10_000;

export function isRateProposedDmMessage(text: string): boolean {
  return text.trim().startsWith(RATE_PROPOSED_DM_PREFIX);
}

export const BOOKING_ACCEPTED_DM_PREFIX = "Booking accepted ·";

export function formatBookingAcceptedDmMessage(eventName: string): string {
  const trimmedEventName = eventName.trim() || "Event";

  return `${BOOKING_ACCEPTED_DM_PREFIX} ${trimmedEventName}`;
}

export function formatBookingAcceptanceActivityMessage(eventName: string): string {
  const trimmedEventName = eventName.trim() || "Event";

  return `${BOOKING_ACTIVITY_DM_PREFIX} accepted · ${trimmedEventName}`;
}

export function parseBookingAcceptanceActivityEventName(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^BOOKING ACTIVITY · accepted · (.+)$/i);

  return match?.[1]?.trim() || null;
}

export function isBookingAcceptedDmMessage(text: string): boolean {
  return text.trim().startsWith(BOOKING_ACCEPTED_DM_PREFIX);
}

export const BOOKING_CANCELLED_DM_PREFIX = "Booking cancelled ·";

const BOOKING_CANCELLED_DM_DUPLICATE_WINDOW_MS = 10_000;

export const BOOKING_ACTIVITY_DM_PREFIX = "BOOKING ACTIVITY ·";

export function isBookingActivityDmMessage(text: string): boolean {
  return text.trim().startsWith(BOOKING_ACTIVITY_DM_PREFIX);
}

export function parseBookingActivityBookingId(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^BOOKING ACTIVITY · cancelled:([0-9a-f-]+)$/i);

  return match?.[1]?.trim() || null;
}

function formatBookingCancellationActivityMessage(booking: BookingRequest): string {
  return `${BOOKING_ACTIVITY_DM_PREFIX} cancelled:${booking.id}`;
}

export function formatEventCancellationActivityMessage(eventName: string): string {
  const trimmedEventName = eventName.trim() || "Event";

  return `${BOOKING_ACTIVITY_DM_PREFIX} event-cancelled · ${trimmedEventName}`;
}

export function parseEventCancellationActivityEventName(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^BOOKING ACTIVITY · event-cancelled · (.+)$/i);

  return match?.[1]?.trim() || null;
}

export function formatEventCancelledInboxPreview(eventName?: string | null): string {
  const trimmedEventName = eventName?.trim() || "Event";

  return `Event cancelled · ${trimmedEventName}`;
}

function isBookingAffectedByWholeEventCancellation(booking: BookingRequest): boolean {
  return (
    booking.status === "accepted" ||
    booking.status === "pending" ||
    booking.status === "cancelled"
  );
}

export async function insertEventCancellationActivityMessagesIfNeeded(options: {
  eventName: string;
  plannerUserId: string;
  bookings: BookingRequest[];
}): Promise<void> {
  const messageText = formatEventCancellationActivityMessage(options.eventName);
  const seenConversationIds = new Set<string>();

  for (const booking of options.bookings) {
    if (!booking.conversation_id || !isBookingAffectedByWholeEventCancellation(booking)) {
      continue;
    }

    if (seenConversationIds.has(booking.conversation_id)) {
      continue;
    }

    seenConversationIds.add(booking.conversation_id);

    const { data: existingRows, error: existingError } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", booking.conversation_id)
      .eq("text", messageText)
      .limit(1);

    if (existingError) {
      console.error(
        "[bookings] Failed to check event-cancellation activity duplicate:",
        existingError,
      );
      continue;
    }

    if (existingRows?.[0]) {
      continue;
    }

    const { data: windowRows, error: windowError } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", booking.conversation_id)
      .like("text", `${BOOKING_ACTIVITY_DM_PREFIX} event-cancelled ·%`)
      .limit(1);

    if (windowError) {
      console.error(
        "[bookings] Failed to check event-cancellation activity duplicate window:",
        windowError,
      );
    } else if (windowRows?.[0]) {
      continue;
    }

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: booking.conversation_id,
      user_id: options.plannerUserId,
      text: messageText,
    });

    if (insertError) {
      console.error("[bookings] Failed to insert event-cancellation activity DM message:", insertError);
    }
  }
}

async function insertBookingCancellationActivityMessageIfNeeded(
  booking: BookingRequest,
): Promise<void> {
  if (!booking.conversation_id || !booking.cancelled_by) {
    return;
  }

  const messageText = formatBookingCancellationActivityMessage(booking);

  const { data: existingRows, error: existingError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", booking.conversation_id)
    .eq("text", messageText)
    .limit(1);

  if (existingError) {
    console.error("[bookings] Failed to check booking-activity DM duplicate:", existingError);
    return;
  }

  if (existingRows?.[0]) {
    return;
  }

  const cancelledAtMs = booking.cancelled_at
    ? new Date(booking.cancelled_at).getTime()
    : null;

  if (cancelledAtMs != null) {
    const windowStart = new Date(
      cancelledAtMs - BOOKING_CANCELLED_DM_DUPLICATE_WINDOW_MS,
    ).toISOString();
    const windowEnd = new Date(
      cancelledAtMs + BOOKING_CANCELLED_DM_DUPLICATE_WINDOW_MS,
    ).toISOString();

    const { data: windowRows, error: windowError } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", booking.conversation_id)
      .like("text", `${BOOKING_ACTIVITY_DM_PREFIX}%`)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd)
      .limit(1);

    if (windowError) {
      console.error("[bookings] Failed to check booking-activity DM duplicate window:", windowError);
    } else if (windowRows?.[0]) {
      return;
    }
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: booking.conversation_id,
    user_id: booking.cancelled_by,
    text: messageText,
  });

  if (insertError) {
    console.error("[bookings] Failed to insert booking-activity DM message:", insertError);
  }
}

export function formatBookingCancelledDmMessage(booking: BookingRequest): string {
  const trimmedReason = booking.cancellation_reason?.trim();

  if (trimmedReason) {
    return `${BOOKING_CANCELLED_DM_PREFIX} ${formatPublicCancellationReason(trimmedReason)}`;
  }

  const trimmedEventName = booking.event_name.trim() || "Event";

  return `${BOOKING_CANCELLED_DM_PREFIX} ${trimmedEventName}`;
}

export function isBookingCancelledDmMessage(text: string): boolean {
  return text.trim().startsWith(BOOKING_CANCELLED_DM_PREFIX);
}

async function insertBookingCancelledDmMessageIfNeeded(
  booking: BookingRequest,
): Promise<{ inserted: boolean; messageText: string }> {
  const messageText = formatBookingCancelledDmMessage(booking);

  if (!booking.conversation_id || !booking.cancelled_by) {
    return { inserted: false, messageText };
  }

  const cancelledAtMs = booking.cancelled_at
    ? new Date(booking.cancelled_at).getTime()
    : null;

  const { data: existingRows, error: existingError } = await supabase
    .from("messages")
    .select("id, created_at")
    .eq("conversation_id", booking.conversation_id)
    .eq("text", messageText)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    console.error("[bookings] Failed to check booking-cancelled DM duplicate:", existingError);
  } else if (existingRows?.[0]) {
    return { inserted: false, messageText };
  }

  if (cancelledAtMs != null) {
    const windowStart = new Date(cancelledAtMs - BOOKING_CANCELLED_DM_DUPLICATE_WINDOW_MS).toISOString();
    const windowEnd = new Date(cancelledAtMs + BOOKING_CANCELLED_DM_DUPLICATE_WINDOW_MS).toISOString();

    const { data: windowRows, error: windowError } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", booking.conversation_id)
      .like("text", `${BOOKING_CANCELLED_DM_PREFIX}%`)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd)
      .limit(1);

    if (windowError) {
      console.error(
        "[bookings] Failed to check booking-cancelled DM duplicate window:",
        windowError,
      );
    } else if (windowRows?.[0]) {
      return { inserted: false, messageText };
    }
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: booking.conversation_id,
    user_id: booking.cancelled_by,
    text: messageText,
  });

  if (insertError) {
    console.error("[bookings] Failed to insert booking-cancelled DM notice:", insertError);
    return { inserted: false, messageText };
  }

  return { inserted: true, messageText };
}

export function formatRateProposedDmMessage(
  proposedRate: number | null | undefined,
): string {
  return `${RATE_PROPOSED_DM_PREFIX} ${formatIntegerRateDisplay(proposedRate)}`;
}

async function insertRateProposedDmMessageIfNeeded(
  booking: BookingRequest,
): Promise<{ inserted: boolean; messageText: string; warning: string | null }> {
  const messageText = formatRateProposedDmMessage(booking.proposed_rate);

  if (!booking.conversation_id) {
    return {
      inserted: false,
      messageText,
      warning: "Your rate was submitted, but this booking has no DM thread to update.",
    };
  }

  const proposalAtMs = booking.proposed_rate_at
    ? new Date(booking.proposed_rate_at).getTime()
    : null;

  const { data: existingRows, error: existingError } = await supabase
    .from("messages")
    .select("id, created_at")
    .eq("conversation_id", booking.conversation_id)
    .eq("user_id", booking.recipient_id)
    .eq("text", messageText)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    console.error("[bookings] Failed to check rate-proposal DM duplicate:", existingError);
  } else {
    const existing = existingRows?.[0];

    if (existing && proposalAtMs != null) {
      const existingAtMs = new Date(existing.created_at).getTime();

      if (Math.abs(existingAtMs - proposalAtMs) <= RATE_PROPOSED_DM_DUPLICATE_WINDOW_MS) {
        return { inserted: false, messageText, warning: null };
      }
    }
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: booking.conversation_id,
    user_id: booking.recipient_id,
    text: messageText,
  });

  if (insertError) {
    return {
      inserted: false,
      messageText,
      warning: `Your rate was submitted, but the DM thread could not be updated. ${insertError.message}`,
    };
  }

  return { inserted: true, messageText, warning: null };
}

async function insertBookingAcceptedDmMessageIfNeeded(
  booking: BookingRequest,
): Promise<{ inserted: boolean; messageText: string }> {
  const messageText = formatBookingAcceptedDmMessage(booking.event_name);
  const activityText = formatBookingAcceptanceActivityMessage(booking.event_name);

  if (!booking.conversation_id) {
    return { inserted: false, messageText };
  }

  const { data: existingActivityRows, error: existingActivityError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", booking.conversation_id)
    .eq("text", activityText)
    .limit(1);

  if (existingActivityError) {
    console.error(
      "[bookings] Failed to check booking-accepted activity duplicate:",
      existingActivityError,
    );
  } else if (existingActivityRows?.[0]) {
    return { inserted: false, messageText };
  }

  const { data: existingActivityPrefixRows, error: existingActivityPrefixError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", booking.conversation_id)
    .like("text", `${BOOKING_ACTIVITY_DM_PREFIX} accepted ·%`)
    .limit(1);

  if (existingActivityPrefixError) {
    console.error(
      "[bookings] Failed to check booking-accepted activity prefix duplicate:",
      existingActivityPrefixError,
    );
  } else if (existingActivityPrefixRows?.[0]) {
    return { inserted: false, messageText };
  }

  const { data: existingLegacyRows, error: existingLegacyError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", booking.conversation_id)
    .eq("user_id", booking.recipient_id)
    .eq("text", messageText)
    .limit(1);

  if (existingLegacyError) {
    console.error("[bookings] Failed to check legacy booking-accepted DM duplicate:", existingLegacyError);
  } else if (existingLegacyRows?.[0]) {
    return { inserted: false, messageText };
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: booking.conversation_id,
    user_id: booking.recipient_id,
    text: activityText,
  });

  if (insertError) {
    console.error("[bookings] Failed to insert booking-accepted activity DM message:", insertError);
    return { inserted: false, messageText };
  }

  return { inserted: true, messageText };
}

export const RATE_PROPOSAL_DECLINED_DM_PREFIX = "Proposal declined ·";

export const RATE_PROPOSAL_DECLINED_DM_MESSAGE =
  "Proposal declined · original offer still available";

export function isRateProposalDeclinedDmMessage(text: string): boolean {
  return text.trim().startsWith(RATE_PROPOSAL_DECLINED_DM_PREFIX);
}

async function insertRateProposalDeclinedDmMessageIfNeeded(
  booking: BookingRequest,
): Promise<{ inserted: boolean }> {
  if (!booking.conversation_id) {
    return { inserted: false };
  }

  const { data: latestProposedRows, error: proposedError } = await supabase
    .from("messages")
    .select("created_at")
    .eq("conversation_id", booking.conversation_id)
    .eq("user_id", booking.recipient_id)
    .like("text", `${RATE_PROPOSED_DM_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (proposedError) {
    console.error("[bookings] Failed to load latest rate-proposal DM notice:", proposedError);
  }

  const latestProposedAt = latestProposedRows?.[0]?.created_at;

  let declineQuery = supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", booking.conversation_id)
    .eq("user_id", booking.sender_id)
    .eq("text", RATE_PROPOSAL_DECLINED_DM_MESSAGE);

  if (latestProposedAt) {
    declineQuery = declineQuery.gte("created_at", latestProposedAt);
  }

  const { data: existingDeclines, error: existingError } = await declineQuery
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    console.error("[bookings] Failed to check proposal-declined DM duplicate:", existingError);
  } else if (existingDeclines?.[0]) {
    return { inserted: false };
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: booking.conversation_id,
    user_id: booking.sender_id,
    text: RATE_PROPOSAL_DECLINED_DM_MESSAGE,
  });

  if (insertError) {
    console.error("[bookings] Failed to insert proposal-declined DM notice:", insertError);
    return { inserted: false };
  }

  return { inserted: true };
}

const BOOKING_PREVIEW_LABELS: Record<BookingRequestStatus, string> = {
  pending: "Booking request",
  accepted: "Booking accepted",
  declined: "Booking declined",
  cancelled: "Booking cancelled",
};

export function formatBookingStatusPreview(
  status: BookingRequestStatus | null | undefined,
  eventName?: string | null,
): string {
  const label =
    status && status in BOOKING_PREVIEW_LABELS
      ? BOOKING_PREVIEW_LABELS[status]
      : "Booking update";
  const trimmedEventName = eventName?.trim();

  return trimmedEventName ? `${label} · ${trimmedEventName}` : label;
}

export function formatBookingMessagePreview(
  messageText: string,
  booking?: BookingRequest | null,
  options?: { bookings?: BookingRequest[] },
): string {
  const trimmed = messageText.trim();

  if (trimmed === CANCELLED_BOOKING_DM_SYSTEM_MESSAGE) {
    return trimmed;
  }

  if (isBookingCancelledDmMessage(trimmed)) {
    return trimmed;
  }

  if (isBookingActivityDmMessage(trimmed)) {
    const eventCancelledName = parseEventCancellationActivityEventName(trimmed);

    if (eventCancelledName) {
      return formatEventCancelledInboxPreview(eventCancelledName);
    }

    const acceptedEventName = parseBookingAcceptanceActivityEventName(trimmed);

    if (acceptedEventName) {
      return formatBookingStatusPreview("accepted", acceptedEventName);
    }

    const activityBookingId = parseBookingActivityBookingId(trimmed);

    if (activityBookingId) {
      const referencedBooking =
        booking?.id === activityBookingId
          ? booking
          : options?.bookings?.find((item) => item.id === activityBookingId) ?? booking;

      if (referencedBooking) {
        return formatBookingStatusPreview(referencedBooking.status, referencedBooking.event_name);
      }
    }

    return formatBookingStatusPreview("cancelled", booking?.event_name);
  }

  if (isBookingAcceptedDmMessage(trimmed)) {
    const acceptedEventName = trimmed.slice(BOOKING_ACCEPTED_DM_PREFIX.length).trim();

    return formatBookingStatusPreview("accepted", acceptedEventName || booking?.event_name);
  }

  if (!isBookingRequestMessage(trimmed)) {
    return trimmed;
  }

  const parsed = parseBookingRequestMessage(trimmed);
  const status =
    booking?.status != null
      ? normalizeBookingRequestStatus(booking.status)
      : parsed?.status ?? "pending";
  const eventName = booking?.event_name ?? parsed?.eventName;

  return formatBookingStatusPreview(status, eventName);
}

export function shouldShowCancelledBookingDmSystemMessage(
  liveBooking: BookingRequest | null | undefined,
  messageText?: string,
): boolean {
  if (normalizeBookingRequestStatus(liveBooking?.status) === "cancelled") {
    return true;
  }

  if (messageText) {
    const parsed = parseBookingRequestMessage(messageText);
    if (parsed?.status === "cancelled") {
      return true;
    }
  }

  return false;
}

export type DmCancelledBookingMatchContext = {
  cancelledBookingIds: Set<string>;
  cancelledBookings: BookingRequest[];
};

export type DmBookingCardVisibility = {
  hideCard: boolean;
  parsedEventName: string | null;
  parsedEventDate: string | null;
  parsedRate: string | null;
  matchedBookingId: string | null;
  matchedBookingStatus: BookingRequestStatus | null;
};

function dmBookingMessageFieldMatch(
  parsed: NonNullable<ReturnType<typeof parseBookingRequestMessage>>,
  booking: BookingRequest,
): boolean {
  if (!parsed.eventName || booking.event_name !== parsed.eventName) {
    return false;
  }

  if (parsed.eventDate && booking.event_date !== parsed.eventDate) {
    return false;
  }

  if (parsed.setTime && booking.set_time !== parsed.setTime) {
    return false;
  }

  if (parsed.fee && normalizeStoredRate(booking.fee) !== normalizeStoredRate(parsed.fee)) {
    return false;
  }

  if (parsed.venue && booking.venue !== parsed.venue) {
    return false;
  }

  return true;
}

function scoreDmBookingFieldMatch(
  parsed: NonNullable<ReturnType<typeof parseBookingRequestMessage>>,
  booking: BookingRequest,
): number {
  let score = 0;

  if (parsed.eventDate && booking.event_date === parsed.eventDate) {
    score += 1;
  }

  if (parsed.setTime && booking.set_time === parsed.setTime) {
    score += 1;
  }

  if (parsed.fee && normalizeStoredRate(booking.fee) === normalizeStoredRate(parsed.fee)) {
    score += 1;
  }

  if (parsed.venue && booking.venue === parsed.venue) {
    score += 1;
  }

  return score;
}

export function buildDmCancelledBookingMatchContext(
  bookings: BookingRequest[],
  conversationId: string,
): DmCancelledBookingMatchContext {
  const cancelledBookings = bookings.filter(
    (booking) =>
      (!booking.conversation_id || booking.conversation_id === conversationId) &&
      normalizeBookingRequestStatus(booking.status) === "cancelled",
  );

  return {
    cancelledBookingIds: new Set(cancelledBookings.map((booking) => booking.id)),
    cancelledBookings,
  };
}

export function findCancelledBookingMatchForDmMessage(
  messageText: string,
  bookings: BookingRequest[],
  conversationId: string,
): BookingRequest | null {
  if (!isBookingRequestMessage(messageText)) {
    return null;
  }

  const parsed = parseBookingRequestMessage(messageText);

  if (!parsed) {
    return null;
  }

  const { cancelledBookingIds, cancelledBookings } = buildDmCancelledBookingMatchContext(
    bookings,
    conversationId,
  );

  if (parsed.bookingId && cancelledBookingIds.has(parsed.bookingId)) {
    return cancelledBookings.find((booking) => booking.id === parsed.bookingId) ?? null;
  }

  const fieldMatches = cancelledBookings.filter((booking) =>
    dmBookingMessageFieldMatch(parsed, booking),
  );

  if (fieldMatches.length === 0) {
    return null;
  }

  if (fieldMatches.length === 1) {
    return fieldMatches[0];
  }

  return [...fieldMatches].sort((left, right) => {
    const scoreDiff =
      scoreDmBookingFieldMatch(parsed, right) - scoreDmBookingFieldMatch(parsed, left);

    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  })[0];
}

export function evaluateDmBookingCardVisibility(
  messageText: string,
  bookings: BookingRequest[],
  conversationId: string,
): DmBookingCardVisibility {
  const parsed = parseBookingRequestMessage(messageText);
  const cancelledMatch = findCancelledBookingMatchForDmMessage(
    messageText,
    bookings,
    conversationId,
  );
  const liveBooking = resolveLiveBookingForDmMessage(messageText, bookings, conversationId);
  const matchedBooking = cancelledMatch ?? liveBooking;
  const hideCard =
    !matchedBooking && shouldShowCancelledBookingDmSystemMessage(liveBooking, messageText);

  return {
    hideCard,
    parsedEventName: parsed?.eventName ?? null,
    parsedEventDate: parsed?.eventDate ?? null,
    parsedRate: parsed?.fee ?? null,
    matchedBookingId: matchedBooking?.id ?? parsed?.bookingId ?? null,
    matchedBookingStatus: matchedBooking
      ? normalizeBookingRequestStatus(matchedBooking.status)
      : parsed?.status ?? null,
  };
}

export function resolveLiveBookingForDmMessage(
  messageText: string,
  bookings: BookingRequest[],
  conversationId: string,
): BookingRequest | null {
  if (!isBookingRequestMessage(messageText)) {
    return null;
  }

  const parsed = parseBookingRequestMessage(messageText);

  if (!parsed) {
    return null;
  }

  const conversationBookings = bookings.filter(
    (booking) => !booking.conversation_id || booking.conversation_id === conversationId,
  );

  if (parsed.bookingId) {
    const byId = conversationBookings.find((booking) => booking.id === parsed.bookingId);

    if (byId) {
      return byId;
    }
  }

  const fieldMatches = conversationBookings.filter((booking) =>
    dmBookingMessageFieldMatch(parsed, booking),
  );

  if (fieldMatches.length === 1) {
    return fieldMatches[0];
  }

  if (fieldMatches.length > 1) {
    const cancelledMatch = fieldMatches.find(
      (booking) => normalizeBookingRequestStatus(booking.status) === "cancelled",
    );

    if (cancelledMatch) {
      return cancelledMatch;
    }

    const bestMatch = [...fieldMatches].sort((left, right) => {
      const scoreDiff =
        scoreDmBookingFieldMatch(parsed, right) - scoreDmBookingFieldMatch(parsed, left);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })[0];

    return bestMatch;
  }

  return null;
}

export function logBookingsLoadError(error: unknown): void {
  console.error("load bookings error:");

  if (error && typeof error === "object") {
    const supabaseError = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    console.error("error.message:", supabaseError.message);
    console.error("error.code:", supabaseError.code);
    console.error("error.details:", supabaseError.details);
    console.error("error.hint:", supabaseError.hint);
    return;
  }

  console.error("error.message:", error instanceof Error ? error.message : String(error));
  console.error("error.code:", undefined);
  console.error("error.details:", undefined);
  console.error("error.hint:", undefined);
}

export function getBookingMutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("planner could not be notified")) {
    return error.message;
  }

  const notificationMessage = getNotificationCreateErrorMessage(error);

  if (notificationMessage !== "Failed to create notification") {
    return notificationMessage;
  }

  if (error && typeof error === "object") {
    const supabaseError = error as {
      message?: string;
      code?: string;
      details?: string;
    };

    if (
      supabaseError.code === "PGRST202" ||
      supabaseError.code === "42883" ||
      supabaseError.message?.includes("cancel_booking_request")
    ) {
      return "Booking cancellation is not set up yet. Run scripts/setupBookingCancellation.sql in Supabase.";
    }

    if (
      supabaseError.message?.includes("archive_booking_request") ||
      supabaseError.message?.includes("unarchive_booking_request")
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[bookings] Booking archive is unavailable. Apply scripts/setupBookingRequestArchiving.sql before using planner archive actions.",
        );
      }

      return "Archive is unavailable right now. Please try again later.";
    }

    if (
      supabaseError.code === "PGRST202" ||
      supabaseError.code === "42883" ||
      supabaseError.message?.includes("hide_booking_request_from_history") ||
      supabaseError.message?.includes("hide_booking_requests_from_history")
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[bookings] Booking history hide is unavailable. Apply supabase/migrations/20250710130000_booking_request_history_hides.sql before using Remove from history.",
        );
      }

      return "Remove from history is unavailable right now. Please try again later.";
    }

    if (supabaseError.code === "42P01" && supabaseError.message?.includes("booking_request_history_hides")) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[bookings] Booking history hide table is unavailable. Apply supabase/migrations/20250710130000_booking_request_history_hides.sql.",
        );
      }

      return "Remove from history is unavailable right now. Please try again later.";
    }

    if (supabaseError.code === "PGRST116") {
      return "Could not cancel this booking request. It may no longer be pending, or cancellation permissions are not set up. Run scripts/setupBookingCancellation.sql in Supabase.";
    }

    if (supabaseError.code === "23514") {
      return "Cancelled status is not enabled yet. Run scripts/setupBookingCancellation.sql in Supabase.";
    }

    if (supabaseError.code === "23505") {
      return "This DJ already has an active booking request for this event.";
    }

    if (supabaseError.code === "42501") {
      return "You do not have permission to cancel this booking request. Run scripts/setupBookingCancellation.sql in Supabase.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }

    if (supabaseError.details) {
      return supabaseError.details;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to update booking request";
}

export async function getBookingRequestsForConversation(
  conversationId: string,
): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(BOOKING_REQUEST_FIELDS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    logBookingsLoadError(error);
    throw error;
  }

  return mapBookingRequestRows(data);
}

export async function listBookingRequestsForConversations(
  conversationIds: string[],
): Promise<Map<string, BookingRequest[]>> {
  const uniqueConversationIds = [
    ...new Set(conversationIds.map((conversationId) => conversationId.trim()).filter(Boolean)),
  ];
  const bookingsByConversationId = new Map<string, BookingRequest[]>();

  if (uniqueConversationIds.length === 0) {
    return bookingsByConversationId;
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select(BOOKING_REQUEST_FIELDS)
    .in("conversation_id", uniqueConversationIds)
    .order("created_at", { ascending: true });

  if (error) {
    logBookingsLoadError(error);
    throw error;
  }

  for (const row of data ?? []) {
    const conversationId =
      typeof row.conversation_id === "string" ? row.conversation_id.trim() : "";

    if (!conversationId) {
      continue;
    }

    const booking = normalizeBookingRequest(row);

    if (!booking) {
      continue;
    }

    const existing = bookingsByConversationId.get(conversationId) ?? [];
    existing.push(booking);
    bookingsByConversationId.set(conversationId, existing);
  }

  return bookingsByConversationId;
}

export async function fetchBookingRequestsByIds(bookingIds: string[]): Promise<BookingRequest[]> {
  const uniqueIds = [...new Set(bookingIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select(BOOKING_REQUEST_FIELDS)
    .in("id", uniqueIds);

  if (error) {
    logBookingsLoadError(error);
    throw error;
  }

  return mapBookingRequestRows(data);
}

export function mergeBookingRequests(
  existing: BookingRequest[],
  incoming: BookingRequest[],
): BookingRequest[] {
  const merged = new Map(existing.map((booking) => [booking.id, booking]));

  for (const booking of incoming) {
    merged.set(booking.id, booking);
  }

  return [...merged.values()].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

export function extractBookingIdsFromMessages(
  messages: Array<{ text: string }>,
): string[] {
  const ids = new Set<string>();

  for (const message of messages) {
    if (!isBookingRequestMessage(message.text)) {
      continue;
    }

    const parsed = parseBookingRequestMessage(message.text);

    if (parsed?.bookingId) {
      ids.add(parsed.bookingId);
    }
  }

  return [...ids];
}

export type BookingRequestMessageSource = {
  id: string;
  text: string;
};

export function findDmMessageIdForBookingRequest(
  messages: BookingRequestMessageSource[],
  bookingRequestId: string,
): string | null {
  const normalizedTarget = bookingRequestId.trim();

  if (!normalizedTarget) {
    return null;
  }

  for (const message of messages) {
    if (!isBookingRequestMessage(message.text)) {
      continue;
    }

    const parsed = parseBookingRequestMessage(message.text);

    if (parsed?.bookingId === normalizedTarget) {
      return message.id;
    }
  }

  return null;
}

export function isBookingRateProposalSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as { message?: string; code?: string };

  return (
    supabaseError.code === "42703" ||
    supabaseError.code === "PGRST204" ||
    Boolean(supabaseError.message?.includes("rate_mode")) ||
    Boolean(supabaseError.message?.includes("proposed_rate"))
  );
}

export const BOOKING_RATE_PROPOSAL_SCHEMA_RELOAD_SQL = "NOTIFY pgrst, 'reload schema';";

const BOOKING_REQUEST_FIELDS =
  "id, created_at, sender_id, recipient_id, conversation_id, event_id, event_name, venue, event_date, set_time, fee, notes, status, archived_at, lineup_hidden_at, cancelled_at, cancelled_by, cancellation_reason, rate_mode, proposed_rate, proposed_rate_note, proposed_rate_at, proposed_rate_status";

export function buildBookingDisplayFromMessage(
  messageText: string,
  conversationId: string,
): BookingRequest | null {
  const parsed = parseBookingRequestMessage(messageText);

  if (!parsed?.eventName || !parsed.bookingId) {
    return null;
  }

  return {
    id: parsed.bookingId,
    created_at: new Date().toISOString(),
    sender_id: "",
    recipient_id: "",
    conversation_id: conversationId,
    event_id: null,
    event_name: parsed.eventName,
    venue: parsed.venue ?? "",
    event_date: parsed.eventDate ?? "",
    set_time: parsed.setTime ?? "",
    fee: normalizeStoredRate(parsed.fee ?? ""),
    notes: parsed.notes === "None" ? "" : parsed.notes ?? "",
    status: normalizeBookingRequestStatus(parsed.status ?? "pending"),
    archived_at: null,
    lineup_hidden_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    rate_mode: "fixed",
    proposed_rate: null,
    proposed_rate_note: null,
    proposed_rate_at: null,
    proposed_rate_status: null,
  };
}

export type BookingSendResult = {
  conversationId: string;
  booking: BookingRequest;
};

export async function sendBookingRequestToDj(
  recipientId: string,
  input: BookingRequestInput,
): Promise<BookingSendResult> {
  const currentUserId = await getCurrentUserId();
  const conversationId = await startDm(currentUserId, recipientId);
  const rateMode = resolveBookingRequestRateMode(input);
  const insertPayload = {
    sender_id: currentUserId,
    recipient_id: recipientId,
    conversation_id: conversationId,
    event_id: input.eventId ?? null,
    event_name: input.eventName.trim(),
    venue: input.venue.trim(),
    event_date: input.eventDate.trim(),
    set_time: input.setTime.trim(),
    fee: normalizeStoredRate(input.fee),
    notes: input.notes.trim(),
    status: "pending" as const,
    rate_mode: rateMode,
  };

  const { data: bookingRow, error: bookingError } = await supabase
    .from("booking_requests")
    .insert(insertPayload)
    .select(BOOKING_REQUEST_FIELDS)
    .single();

  if (bookingError) {
    throw bookingError;
  }

  const booking = normalizeBookingRequest(bookingRow);

  if (!booking) {
    throw new Error("Created booking could not be parsed.");
  }

  assertInsertedBookingRateMode(rateMode, booking);

  const messageText = formatBookingRequestMessage(booking);

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    user_id: currentUserId,
    text: messageText,
  });

  if (messageError) {
    throw messageError;
  }

  await createNotification(
    recipientId,
    "booking_request",
    "New booking request",
    `${input.eventName.trim()} at ${input.venue.trim()}`,
    `/dm/${conversationId}`,
  );

  return { conversationId, booking };
}

export function getEventLineupStats(bookings: BookingRequest[]): BookingCampaignStats {
  return bookings.reduce(
    (stats, request) => {
      if (request.status === "cancelled") {
        stats.cancelled += 1;
        return stats;
      }

      stats.total += 1;
      stats[request.status] += 1;
      return stats;
    },
    { total: 0, pending: 0, accepted: 0, declined: 0, cancelled: 0 },
  );
}

export function getActiveEventLineupStats(
  bookings: BookingRequest[],
): Pick<BookingCampaignStats, "total" | "pending" | "accepted" | "declined"> {
  const stats = getEventLineupStats(
    filterActiveBookings(filterVisibleEventLineupBookings(bookings)),
  );

  return {
    total: stats.total,
    pending: stats.pending,
    accepted: stats.accepted,
    declined: stats.declined,
  };
}

const LINEUP_STATS_BOOKING_FIELDS = "id, event_id, status, lineup_hidden_at";

const LINEUP_STATS_EVENT_ID_CHUNK_SIZE = 100;

export async function listBookingRequestsForEventLineupStats(
  eventIds: string[],
): Promise<Map<string, BookingRequest[]>> {
  const uniqueEventIds = [...new Set(eventIds.map((eventId) => eventId.trim()).filter(Boolean))];
  const bookingsByEventId = new Map<string, BookingRequest[]>(
    uniqueEventIds.map((eventId) => [eventId, []]),
  );

  if (uniqueEventIds.length === 0) {
    return bookingsByEventId;
  }

  for (let index = 0; index < uniqueEventIds.length; index += LINEUP_STATS_EVENT_ID_CHUNK_SIZE) {
    const chunk = uniqueEventIds.slice(index, index + LINEUP_STATS_EVENT_ID_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("booking_requests")
      .select(LINEUP_STATS_BOOKING_FIELDS)
      .in("event_id", chunk);

    if (error) {
      logBookingsLoadError(error);
      throw error;
    }

    for (const booking of mapBookingRequestRows(data)) {
      const eventId = booking.event_id?.trim();

      if (!eventId || !bookingsByEventId.has(eventId)) {
        continue;
      }

      bookingsByEventId.get(eventId)?.push(booking);
    }
  }

  return bookingsByEventId;
}

export async function listBookingRequestsForEvent(eventId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(BOOKING_REQUEST_FIELDS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    logBookingsLoadError(error);
    throw error;
  }

  return mapBookingRequestRows(data);
}

export async function getEventIdsWithAcceptedBookings(eventIds: string[]): Promise<Set<string>> {
  const uniqueEventIds = [...new Set(eventIds.map((eventId) => eventId.trim()).filter(Boolean))];

  if (uniqueEventIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select("event_id")
    .in("event_id", uniqueEventIds)
    .eq("status", "accepted");

  if (error) {
    logBookingsLoadError(error);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => (typeof row.event_id === "string" ? row.event_id : null))
      .filter((eventId): eventId is string => Boolean(eventId)),
  );
}

export async function listSentBookingRequests(): Promise<BookingRequest[]> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("booking_requests")
    .select(BOOKING_REQUEST_FIELDS)
    .eq("sender_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    logBookingsLoadError(error);
    throw error;
  }

  return mapBookingRequestRows(data);
}

export async function listReceivedBookingRequests(): Promise<BookingRequest[]> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("booking_requests")
    .select(BOOKING_REQUEST_FIELDS)
    .eq("recipient_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    logBookingsLoadError(error);
    throw error;
  }

  return mapBookingRequestRows(data);
}

export async function countPendingIncomingGigs(): Promise<number> {
  const bookings = await listReceivedBookingRequests();
  return countDjGigsByTab(bookings).pending;
}

export function resolveBookingDateKey(eventDate: string): string | null {
  return resolveEventDateKey(eventDate);
}

export function getBookingRequestHref(booking: BookingRequest): string {
  const eventId = booking.event_id?.trim();

  if (eventId) {
    return `/events/${eventId}`;
  }

  const conversationId = booking.conversation_id.trim();

  return `/dm/${conversationId}`;
}

export async function listMyActiveReceivedBookings(): Promise<BookingRequest[]> {
  const bookings = await listReceivedBookingRequests();

  return bookings.filter(
    (booking) => booking.status === "pending" || booking.status === "accepted",
  );
}

export function groupActiveBookingsByDate(
  bookings: BookingRequest[],
): Map<string, BookingRequest[]> {
  const grouped = new Map<string, BookingRequest[]>();

  for (const booking of bookings) {
    const dateKey = resolveBookingDateKey(booking.event_date);

    if (!dateKey) {
      continue;
    }

    const existing = grouped.get(dateKey) ?? [];
    existing.push(booking);
    grouped.set(dateKey, existing);
  }

  for (const [dateKey, dayBookings] of grouped) {
    grouped.set(
      dateKey,
      dayBookings.sort((left, right) => left.event_name.localeCompare(right.event_name)),
    );
  }

  return grouped;
}

function getBookingGroupKey(booking: BookingRequest): string {
  const createdMinute = booking.created_at.slice(0, 16);

  return [
    createdMinute,
    booking.event_name,
    booking.venue,
    booking.event_date,
    booking.set_time,
    booking.fee,
    booking.notes,
  ].join("|");
}

export function groupSentBookingRequests(bookings: BookingRequest[]): SentBookingGroup[] {
  const groups = new Map<string, SentBookingGroup>();

  for (const booking of bookings) {
    const key = getBookingGroupKey(booking);
    const existing = groups.get(key);

    if (existing) {
      existing.requests.push(booking);
      continue;
    }

    groups.set(key, {
      key,
      event_name: booking.event_name,
      venue: booking.venue,
      event_date: booking.event_date,
      set_time: booking.set_time,
      fee: booking.fee,
      notes: booking.notes,
      created_at: booking.created_at,
      requests: [booking],
    });
  }

  return [...groups.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getBookingCampaignStats(group: SentBookingGroup): BookingCampaignStats {
  return group.requests.reduce(
    (stats, request) => {
      stats.total += 1;
      stats[request.status] += 1;
      return stats;
    },
    { total: 0, pending: 0, accepted: 0, declined: 0, cancelled: 0 },
  );
}

export function filterBookingGroups(
  groups: SentBookingGroup[],
  filter: BookingStatusFilter,
): SentBookingGroup[] {
  if (filter === "all") {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      requests: group.requests.filter((request) => request.status === filter),
    }))
    .filter((group) => group.requests.length > 0);
}

export function formatBookingStatusLabel(status: BookingRequestStatus): string {
  return formatStatusLabel(status);
}

export type BookingGroupChatAccess =
  | { kind: "open"; href: string }
  | { kind: "locked_pending" }
  | { kind: "hidden" };

export function getBookingGroupChatAccess(
  booking: BookingRequest,
  currentUserId: string | null,
  options?: {
    eventHasAcceptedBooking?: boolean;
    eventCancelled?: boolean;
    crewChatUnlocked?: boolean;
  },
): BookingGroupChatAccess | null {
  if (!booking.event_id || !currentUserId) {
    return null;
  }

  if (options?.eventCancelled || options?.crewChatUnlocked === false) {
    return { kind: "hidden" };
  }

  if (options?.crewChatUnlocked !== true) {
    return { kind: "hidden" };
  }

  if (booking.status === "cancelled" || booking.status === "declined") {
    return { kind: "hidden" };
  }

  if (!options?.eventHasAcceptedBooking) {
    return { kind: "hidden" };
  }

  const href = `/events/${booking.event_id}/chat`;
  const isPlanner = booking.sender_id === currentUserId;
  const isDj = booking.recipient_id === currentUserId;

  if (isPlanner) {
    return { kind: "open", href };
  }

  if (isDj) {
    if (booking.status === "accepted") {
      return { kind: "open", href };
    }

    if (booking.status === "pending") {
      return { kind: "locked_pending" };
    }
  }

  return null;
}

export type EventBookingDuplicateStatus =
  | "already_invited"
  | "already_booked"
  | "already_declined";

export const ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE =
  "No new DJs to send to. Everyone selected already has a request for this event.";

export function getEventBookingDuplicateLabel(status: EventBookingDuplicateStatus): string {
  switch (status) {
    case "already_invited":
      return "Already invited";
    case "already_booked":
      return "Already booked";
    case "already_declined":
      return "Already declined";
  }
}

export function getEventBookingDuplicateBadgeClass(status: EventBookingDuplicateStatus): string {
  switch (status) {
    case "already_invited":
      return FTC_STATUS_PENDING;
    case "already_booked":
      return FTC_STATUS_SUCCESS;
    case "already_declined":
      return FTC_STATUS_MUTED;
  }
}

export function getEventBookingDuplicateStatusForRecipient(
  bookings: BookingRequest[],
  recipientId: string,
): EventBookingDuplicateStatus | null {
  const recipientBookings = bookings.filter((booking) => booking.recipient_id === recipientId);

  if (recipientBookings.length === 0) {
    return null;
  }

  if (recipientBookings.some((booking) => booking.status === "accepted")) {
    return "already_booked";
  }

  if (recipientBookings.some((booking) => booking.status === "pending")) {
    return "already_invited";
  }

  if (recipientBookings.some((booking) => booking.status === "declined")) {
    return "already_declined";
  }

  return null;
}

export function buildEventBookingDuplicateMap(
  bookings: BookingRequest[],
): Map<string, EventBookingDuplicateStatus> {
  const duplicateMap = new Map<string, EventBookingDuplicateStatus>();
  const recipientIds = new Set(bookings.map((booking) => booking.recipient_id));

  for (const recipientId of recipientIds) {
    const status = getEventBookingDuplicateStatusForRecipient(bookings, recipientId);

    if (status) {
      duplicateMap.set(recipientId, status);
    }
  }

  return duplicateMap;
}

export function filterSendableRecipientIdsForEvent(
  recipientIds: string[],
  bookings: BookingRequest[],
): {
  sendableIds: string[];
  skippedIds: string[];
} {
  const sendableIds: string[] = [];
  const skippedIds: string[] = [];

  for (const recipientId of recipientIds) {
    if (getEventBookingDuplicateStatusForRecipient(bookings, recipientId)) {
      skippedIds.push(recipientId);
      continue;
    }

    sendableIds.push(recipientId);
  }

  return { sendableIds, skippedIds };
}

export function buildBookingSendResultMessage(
  successCount: number,
  skippedDuplicateCount: number,
): string {
  const base = `Sent booking request to ${successCount} DJ${successCount === 1 ? "" : "s"}`;

  if (skippedDuplicateCount === 0) {
    return base;
  }

  return `${base} Skipped ${skippedDuplicateCount} DJ${skippedDuplicateCount === 1 ? "" : "s"} who already have a request for this event.`;
}

export async function sendBookingRequestsToDjs(
  recipientIds: string[],
  input: BookingRequestInput,
  options?: {
    existingEventBookings?: BookingRequest[];
    perRecipient?: (
      recipientId: string,
    ) => Partial<Pick<BookingRequestInput, "rateMode" | "fee">> | void;
  },
): Promise<{
  conversationIds: string[];
  successes: string[];
  failures: BookingSendFailure[];
  skippedDuplicateRecipientIds: string[];
}> {
  let targetRecipientIds = recipientIds;
  let skippedDuplicateRecipientIds: string[] = [];

  if (input.eventId && options?.existingEventBookings) {
    const filtered = filterSendableRecipientIdsForEvent(
      recipientIds,
      options.existingEventBookings,
    );
    targetRecipientIds = filtered.sendableIds;
    skippedDuplicateRecipientIds = filtered.skippedIds;
  }

  const results = await Promise.all(
    targetRecipientIds.map(async (recipientId) => {
      try {
        const recipientOverrides = options?.perRecipient?.(recipientId) ?? {};
        const recipientInput: BookingRequestInput = {
          ...input,
          ...recipientOverrides,
        };
        const { conversationId, booking } = await sendBookingRequestToDj(
          recipientId,
          recipientInput,
        );
        return {
          recipientId,
          conversationId,
          booking,
          error: null as string | null,
        };
      } catch (error) {
        console.error(`Failed to send booking request to ${recipientId}:`, error);
        return {
          recipientId,
          conversationId: null,
          booking: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
  );

  const successes: string[] = [];
  const conversationIds: string[] = [];
  const failures: BookingSendFailure[] = [];

  for (const result of results) {
    if (result.conversationId && result.booking) {
      successes.push(result.recipientId);
      conversationIds.push(result.conversationId);
      continue;
    }

    failures.push({
      recipientId: result.recipientId,
      message: result.error ?? "Failed to send booking request",
    });
  }

  return { conversationIds, successes, failures, skippedDuplicateRecipientIds };
}

export async function cancelBookingRequest(
  bookingId: string,
  options?: { reason?: string; previousStatus?: BookingRequestStatus },
): Promise<BookingRequest> {
  const trimmedReason = options?.reason?.trim() || null;
  const { data, error } = await supabase.rpc("cancel_booking_request", {
    p_booking_id: bookingId,
    p_cancellation_reason: trimmedReason,
  });

  if (error) {
    logBookingsLoadError(error);
    throw new Error(getBookingMutationErrorMessage(error));
  }

  if (!data) {
    throw new Error(
      "Could not cancel this booking request. Run scripts/setupAcceptedBookingCancellation.sql in Supabase.",
    );
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    console.error("[bookings] cancel_booking_request returned invalid payload:", data);
    throw new Error("Cancelled booking could not be parsed.");
  }

  if (booking.status !== "cancelled") {
    console.error("[bookings] cancel_booking_request returned unexpected status:", booking);
    throw new Error("Cancelled booking status was not returned correctly.");
  }

  const notifyUserId =
    booking.cancelled_by === booking.recipient_id
      ? booking.sender_id
      : booking.recipient_id;
  const wasAccepted = options?.previousStatus === "accepted";
  const notificationTitle = wasAccepted
    ? booking.cancelled_by === booking.recipient_id
      ? "DJ withdrew from event"
      : "Booking cancelled"
    : "Booking request cancelled";
  const notificationBody = `${booking.event_name} at ${booking.venue}`;

  await createNotification(
    notifyUserId,
    "booking_update",
    notificationTitle,
    notificationBody,
    `/dm/${booking.conversation_id}`,
  );

  try {
    await insertBookingCancellationActivityMessageIfNeeded(booking);
  } catch (activityError) {
    console.error("[bookingRequests] Failed to insert booking-activity DM message:", activityError);
  }

  return booking;
}

export type CancelAcceptedBookingRequestResult = {
  booking: BookingRequest;
  warning: string | null;
};

export async function cancelAcceptedBookingRequest(
  booking: BookingRequest,
  reason: string,
  djDisplayName: string,
): Promise<CancelAcceptedBookingRequestResult> {
  let warning: string | null = null;

  if (booking.event_id && booking.status === "accepted") {
    try {
      const acceptedDjCount = await countAcceptedCrewDjsForEvent(booking.event_id);
      await postBookingCancellationGroupChatUpdate(booking, djDisplayName, reason, {
        remainingAcceptedDjCount: Math.max(acceptedDjCount - 1, 0),
      });
    } catch (groupChatError) {
      console.error(
        "[bookingRequests] Failed to post booking cancellation group chat update:",
        groupChatError,
      );
      warning = `Booking was cancelled, but the group chat could not be updated. ${getBookingMutationErrorMessage(groupChatError)}`;
    }
  }

  const cancelledBooking = await cancelBookingRequest(booking.id, {
    reason,
    previousStatus: "accepted",
  });

  return { booking: cancelledBooking, warning };
}

async function mutateArchivedBookingRequest(
  rpcName: "archive_booking_request" | "unarchive_booking_request",
  bookingId: string,
  setupScript: string,
): Promise<BookingRequest> {
  const { data, error } = await supabase.rpc(rpcName, {
    p_booking_id: bookingId,
  });

  if (error) {
    logBookingsLoadError(error);
    throw new Error(getBookingMutationErrorMessage(error));
  }

  if (!data) {
    throw new Error(`Could not update archived booking. Run ${setupScript} in Supabase.`);
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    console.error(`[bookings] ${rpcName} returned invalid payload:`, data);
    throw new Error("Archived booking could not be parsed.");
  }

  if (rpcName === "archive_booking_request") {
    if (!booking.archived_at) {
      console.error(`[bookings] ${rpcName} did not set archived_at:`, booking);
      throw new Error("Archived booking timestamp was not returned correctly.");
    }
  } else if (booking.archived_at) {
    console.error(`[bookings] ${rpcName} still has archived_at:`, booking);
    throw new Error("Restored booking still appears archived.");
  }

  return booking;
}

export async function archiveBookingRequest(bookingId: string): Promise<BookingRequest> {
  return mutateArchivedBookingRequest(
    "archive_booking_request",
    bookingId,
    "scripts/fixRecipientBookingArchive.sql",
  );
}

export type BookingArchiveFailure = {
  bookingId: string;
  message: string;
};

export async function archiveAllCancelledBookingRequests(
  bookingIds: string[],
): Promise<{
  successes: string[];
  failures: BookingArchiveFailure[];
}> {
  const results = await Promise.all(
    bookingIds.map(async (bookingId) => {
      try {
        await archiveBookingRequest(bookingId);
        return { bookingId, error: null as string | null };
      } catch (error) {
        console.error(`Failed to archive booking request ${bookingId}:`, error);
        return {
          bookingId,
          error: error instanceof Error ? error.message : "Failed to archive booking request",
        };
      }
    }),
  );

  const successes: string[] = [];
  const failures: BookingArchiveFailure[] = [];

  for (const result of results) {
    if (result.error) {
      failures.push({ bookingId: result.bookingId, message: result.error });
      continue;
    }

    successes.push(result.bookingId);
  }

  return { successes, failures };
}

let bookingHistoryHideAvailable = true;

export function isBookingHistoryHideAvailable(): boolean {
  return bookingHistoryHideAvailable;
}

function markBookingHistoryHideUnavailable(): void {
  bookingHistoryHideAvailable = false;
}

function markBookingHistoryHideAvailable(): void {
  bookingHistoryHideAvailable = true;
}

function isMissingBookingHistoryHideSetupError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as { code?: string; message?: string };

  if (supabaseError.code === "42501") {
    return false;
  }

  return (
    supabaseError.code === "PGRST202" ||
    supabaseError.code === "42883" ||
    supabaseError.code === "42P01" ||
    supabaseError.code === "PGRST205"
  );
}

function getBookingHistoryHideErrorMessage(error: unknown): string {
  if (isMissingBookingHistoryHideSetupError(error)) {
    markBookingHistoryHideUnavailable();
    return getBookingMutationErrorMessage(error);
  }

  if (error instanceof Error && error.message.trim()) {
    const message = error.message.trim();

    if (
      !/\.sql/i.test(message) &&
      !/supabase\/migrations/i.test(message) &&
      !/scripts\//i.test(message) &&
      !/hide_booking_requests?_from_history/i.test(message)
    ) {
      return message;
    }
  }

  return "Could not remove selected items from history.";
}

export async function listBookingRequestHistoryHideIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("booking_request_history_hides")
    .select("booking_request_id");

  if (error) {
    if (isMissingBookingHistoryHideSetupError(error)) {
      markBookingHistoryHideUnavailable();
      return [];
    }

    logBookingsLoadError(error);
    throw error;
  }

  markBookingHistoryHideAvailable();

  return (data ?? [])
    .map((row) => row.booking_request_id)
    .filter((bookingId): bookingId is string => typeof bookingId === "string");
}

export type BookingHistoryHideFailure = {
  bookingId: string;
  message: string;
};

export async function hideBookingRequestsFromHistory(
  bookingIds: string[],
): Promise<{
  successes: string[];
  failures: BookingHistoryHideFailure[];
}> {
  if (bookingIds.length === 0) {
    return { successes: [], failures: [] };
  }

  const { data, error } = await supabase.rpc("hide_booking_requests_from_history", {
    p_booking_ids: bookingIds,
  });

  if (error) {
    throw new Error(getBookingHistoryHideErrorMessage(error));
  }

  const updatedIds = Array.isArray((data as { updated_ids?: unknown } | null)?.updated_ids)
    ? ((data as { updated_ids: unknown[] }).updated_ids.filter(
        (value): value is string => typeof value === "string",
      ))
    : [];

  const successes = updatedIds;
  const failures: BookingHistoryHideFailure[] = [];

  for (const bookingId of bookingIds) {
    if (!successes.includes(bookingId)) {
      failures.push({
        bookingId,
        message: "Booking could not be removed from history.",
      });
    }
  }

  return { successes, failures };
}

export async function unarchiveBookingRequest(bookingId: string): Promise<BookingRequest> {
  return mutateArchivedBookingRequest(
    "unarchive_booking_request",
    bookingId,
    "scripts/setupBookingRequestArchiving.sql",
  );
}

export async function hideDeclinedBookingFromLineup(bookingId: string): Promise<BookingRequest> {
  const { data, error } = await supabase.rpc("hide_declined_booking_from_lineup", {
    p_booking_id: bookingId,
  });

  if (error) {
    logBookingsLoadError(error);
    throw new Error(getBookingMutationErrorMessage(error));
  }

  if (!data) {
    throw new Error(
      "Could not hide booking from lineup. Run scripts/setupBookingLineupHide.sql in Supabase.",
    );
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    console.error("[bookings] hide_declined_booking_from_lineup returned invalid payload:", data);
    throw new Error("Hidden booking could not be parsed.");
  }

  if (booking.status !== "declined") {
    console.error("[bookings] hide_declined_booking_from_lineup returned unexpected status:", booking);
    throw new Error("Hidden booking status was not returned correctly.");
  }

  if (!booking.lineup_hidden_at) {
    console.error(
      "[bookings] hide_declined_booking_from_lineup did not set lineup_hidden_at:",
      booking,
    );
    throw new Error("Hidden booking timestamp was not returned correctly.");
  }

  return booking;
}

export type ProposeBookingRateResult = {
  booking: BookingRequest;
  warning: string | null;
};

export async function proposeBookingRate(
  bookingId: string,
  proposedRate: number,
  note?: string,
): Promise<ProposeBookingRateResult> {
  const { data, error } = await supabase.rpc("propose_booking_rate", {
    p_booking_id: bookingId,
    p_proposed_rate: proposedRate,
    p_note: note?.trim() || null,
  });

  if (error) {
    throw error;
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    throw new Error("Proposed rate could not be parsed.");
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[bookings] proposeBookingRate notification context", {
      bookingId: booking.id,
      senderId: booking.sender_id,
      recipientId: booking.recipient_id,
      status: booking.status,
      rateMode: booking.rate_mode,
      proposedRate: booking.proposed_rate,
      proposedRateStatus: booking.proposed_rate_status,
      link: booking.conversation_id ? `/dm/${booking.conversation_id}` : "/bookings",
    });
  }

  const warnings: string[] = [];
  const dmResult = await insertRateProposedDmMessageIfNeeded(booking);

  if (dmResult.warning) {
    warnings.push(dmResult.warning);
  }

  if (dmResult.inserted && booking.conversation_id) {
    try {
      await createNotification(
        booking.sender_id,
        "message",
        "New message",
        dmResult.messageText,
        `/dm/${booking.conversation_id}`,
      );
    } catch (notificationError) {
      warnings.push(
        `Your rate was submitted, but the planner could not be notified. ${getNotificationCreateErrorMessage(notificationError)}`,
      );
    }
  }

  return {
    booking,
    warning: warnings.length > 0 ? warnings.join(" ") : null,
  };
}

export async function acceptProposedBookingRate(bookingId: string): Promise<BookingRequest> {
  const { data, error } = await supabase.rpc("accept_proposed_booking_rate", {
    p_booking_id: bookingId,
  });

  if (error) {
    throw error;
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    throw new Error("Accepted booking could not be parsed.");
  }

  await createNotification(
    booking.recipient_id,
    "booking_update",
    "Proposed rate accepted",
    `${booking.event_name} · ${formatRateDisplay(booking.fee)}`,
    booking.conversation_id ? `/dm/${booking.conversation_id}` : "/bookings",
  );

  if (booking.event_id) {
    try {
      const profiles = await getUserAvatarProfilesByIds([booking.recipient_id]);
      const djName =
        profiles.get(booking.recipient_id)?.display_name?.trim() || "Crew member";
      await postBookingAcceptanceGroupChatUpdate(booking, djName);
    } catch (groupChatError) {
      console.error(
        "[bookingRequests] Failed to post booking acceptance group chat update:",
        groupChatError,
      );
    }
  }

  notifyNavigationBadgesRefresh();
  return booking;
}

export type DeclineProposedBookingRateResult = {
  booking: BookingRequest;
  warning: string | null;
};

export async function declineProposedBookingRate(
  bookingId: string,
): Promise<DeclineProposedBookingRateResult> {
  const { data, error } = await supabase.rpc("decline_proposed_booking_rate", {
    p_booking_id: bookingId,
  });

  if (error) {
    throw error;
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    throw new Error("Declined proposal could not be parsed.");
  }

  await insertRateProposalDeclinedDmMessageIfNeeded(booking);

  let warning: string | null = null;

  try {
    await createNotification(
      booking.recipient_id,
      "booking_update",
      "Original offer kept",
      `${booking.event_name} · ${getBookingOfferRateLabel(booking)}`,
      booking.conversation_id ? `/dm/${booking.conversation_id}` : "/bookings",
    );
  } catch (notificationError) {
    warning = `Original offer was kept, but the DJ could not be notified. ${getNotificationCreateErrorMessage(notificationError)}`;
    console.error("[bookings] booking_update notification failed after proposal decline:", notificationError);
  }

  return { booking, warning };
}

export async function updateBookingRequestStatus(
  bookingId: string,
  status: "accepted" | "declined",
): Promise<BookingRequest> {
  const { data, error } = await supabase
    .from("booking_requests")
    .update({ status })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const booking = normalizeBookingRequest(data);

  if (!booking) {
    throw new Error("Updated booking could not be parsed.");
  }

  if (status === "accepted") {
    const dmResult = await insertBookingAcceptedDmMessageIfNeeded(booking);

    if (dmResult.inserted && booking.conversation_id) {
      try {
        await createNotification(
          booking.sender_id,
          "message",
          "New message",
          dmResult.messageText,
          `/dm/${booking.conversation_id}`,
        );
      } catch (notificationError) {
        console.error(
          "[bookings] message notification failed after booking acceptance:",
          notificationError,
        );
      }
    }

    if (booking.event_id) {
      try {
        const profiles = await getUserAvatarProfilesByIds([booking.recipient_id]);
        const djName =
          profiles.get(booking.recipient_id)?.display_name?.trim() || "Crew member";
        await postBookingAcceptanceGroupChatUpdate(booking, djName, {
          notifyParticipants: false,
        });
      } catch (groupChatError) {
        console.error(
          "[bookings] Failed to post booking acceptance group chat update:",
          groupChatError,
        );
      }
    }

    notifyNavigationBadgesRefresh();
    return booking;
  }

  await createNotification(
    booking.sender_id,
    "booking_update",
    "Booking declined",
    `${booking.event_name} · ${formatStatusLabel(status)}`,
    "/bookings",
  );

  notifyNavigationBadgesRefresh();
  return booking;
}

export function resolveBookingForMessage(
  messageText: string,
  bookings: BookingRequest[],
): BookingRequest | null {
  const parsed = parseBookingRequestMessage(messageText);

  if (parsed?.bookingId) {
    const matched = bookings.find((booking) => booking.id === parsed.bookingId);

    if (matched) {
      return matched;
    }
  }

  if (parsed?.eventName) {
    return (
      bookings.find(
        (booking) =>
          booking.event_name === parsed.eventName &&
          booking.venue === parsed.venue &&
          booking.event_date === parsed.eventDate,
      ) ?? null
    );
  }

  return null;
}

export function resolveBookingForDmMessage(
  messageText: string,
  bookings: BookingRequest[],
  conversationId: string,
): BookingRequest | null {
  if (!isBookingRequestMessage(messageText)) {
    return null;
  }

  const parsed = parseBookingRequestMessage(messageText);

  if (parsed?.bookingId) {
    const fromStore = bookings.find((item) => item.id === parsed.bookingId);

    if (fromStore) {
      return fromStore;
    }
  }

  return mergeBookingWithMessage(null, messageText, bookings, conversationId);
}

export function mergeBookingWithMessage(
  booking: BookingRequest | null,
  messageText: string,
  bookings: BookingRequest[] = [],
  conversationId = "",
): BookingRequest | null {
  const liveBooking =
    booking ??
    (conversationId
      ? resolveLiveBookingForDmMessage(messageText, bookings, conversationId)
      : null);

  if (liveBooking) {
    return liveBooking;
  }

  const parsed = parseBookingRequestMessage(messageText);

  if (!parsed?.eventName) {
    return null;
  }

  if (parsed.bookingId) {
    const byId = bookings.find((item) => item.id === parsed.bookingId);

    if (byId) {
      return byId;
    }
  }

  const cancelledMatch = findCancelledBookingMatchForDmMessage(
    messageText,
    bookings,
    conversationId,
  );

  if (cancelledMatch) {
    return cancelledMatch;
  }

  const parsedFee = normalizeStoredRate(parsed.fee ?? "");

  return {
    id: parsed.bookingId ?? messageText,
    created_at: new Date().toISOString(),
    sender_id: "",
    recipient_id: "",
    conversation_id: conversationId,
    event_id: null,
    event_name: parsed.eventName,
    venue: parsed.venue ?? "",
    event_date: parsed.eventDate ?? "",
    set_time: parsed.setTime ?? "",
    fee: parsedFee,
    notes: parsed.notes === "None" ? "" : parsed.notes ?? "",
    status: normalizeBookingRequestStatus(parsed.status ?? "pending"),
    archived_at: null,
    lineup_hidden_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    rate_mode: parseOfferTypeFromMessage(parsed.offerType) ?? "fixed",
    proposed_rate: null,
    proposed_rate_note: null,
    proposed_rate_at: null,
    proposed_rate_status: null,
  };
}
