import { supabase } from "@/lib/supabaseClient";
import { parseEventDate } from "@/lib/bookingDateTime";
import { createNotification } from "@/lib/notifications";
import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import { startDm } from "@/lib/startDm";
import {
  FTC_STATUS_DANGER,
  FTC_STATUS_MUTED,
  FTC_STATUS_PRIMARY,
  FTC_STATUS_SUCCESS,
  FTC_STATUS_WARNING,
} from "@/lib/ftcFlatStatus";
import { getCurrentUserId, type BookingRecipientProfile } from "@/lib/user/currentUser";
import { postBookingCancellationGroupChatUpdate } from "@/lib/events/bookingCancellation";

export type BookingRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type BookingRequestInput = {
  eventName: string;
  venue: string;
  eventDate: string;
  setTime: string;
  fee: string;
  notes: string;
  eventId?: string;
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

export type DjGigsViewFilter = "pending" | "accepted" | "declined" | "history" | "calendar";

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

export function isArchivedBooking(booking: BookingRequest): boolean {
  return Boolean(booking.archived_at);
}

export function filterHistoryCancelledBookings(bookings: BookingRequest[]): BookingRequest[] {
  return sortBookingsNewestFirst(
    bookings.filter((booking) => booking.status === "cancelled" && !booking.archived_at),
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
    bookingId: values["booking id"] ?? null,
    eventName: values.event ?? null,
    venue: values.venue ?? null,
    eventDate: values.date ?? null,
    setTime: values["set time"] ?? null,
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
): string {
  const trimmed = messageText.trim();

  if (trimmed === CANCELLED_BOOKING_DM_SYSTEM_MESSAGE) {
    return trimmed;
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
      console.log("[dm booking] resolved by id", {
        parsedBookingId: parsed.bookingId,
        liveBookingId: byId.id,
        status: byId.status,
      });
      return byId;
    }
  }

  const fieldMatches = conversationBookings.filter((booking) =>
    dmBookingMessageFieldMatch(parsed, booking),
  );

  if (fieldMatches.length === 1) {
    console.log("[dm booking] resolved by fields", {
      parsedBookingId: parsed.bookingId,
      liveBookingId: fieldMatches[0].id,
      status: fieldMatches[0].status,
    });
    return fieldMatches[0];
  }

  if (fieldMatches.length > 1) {
    const cancelledMatch = fieldMatches.find(
      (booking) => normalizeBookingRequestStatus(booking.status) === "cancelled",
    );

    if (cancelledMatch) {
      console.log("[dm booking] resolved cancelled duplicate", {
        parsedBookingId: parsed.bookingId,
        liveBookingId: cancelledMatch.id,
        status: cancelledMatch.status,
      });
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

    console.log("[dm booking] resolved best duplicate", {
      parsedBookingId: parsed.bookingId,
      liveBookingId: bestMatch.id,
      status: bestMatch.status,
    });
    return bestMatch;
  }

  console.log("[dm booking] unresolved live booking", {
    parsedBookingId: parsed.bookingId,
    parsedStatus: parsed.status,
    conversationBookingCount: conversationBookings.length,
  });

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
      return "Booking archiving is not set up yet. Run scripts/setupBookingRequestArchiving.sql in Supabase.";
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
    throw error;
  }

  return mapBookingRequestRows(data);
}

export async function sendBookingRequestToDj(
  recipientId: string,
  input: BookingRequestInput,
): Promise<string> {
  const currentUserId = await getCurrentUserId();
  const conversationId = await startDm(currentUserId, recipientId);

  const { data: booking, error: bookingError } = await supabase
    .from("booking_requests")
    .insert({
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
      status: "pending",
    })
    .select("*")
    .single();

  if (bookingError) {
    throw bookingError;
  }

  const messageText = formatBookingRequestMessage(booking as BookingRequest);

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

  return conversationId;
}

const BOOKING_REQUEST_FIELDS =
  "id, created_at, sender_id, recipient_id, conversation_id, event_id, event_name, venue, event_date, set_time, fee, notes, status, archived_at, lineup_hidden_at, cancelled_at, cancelled_by, cancellation_reason";

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

export function resolveBookingDateKey(eventDate: string): string | null {
  const parsed = parseEventDate(eventDate);
  return parsed.isoDate || null;
}

export function getBookingRequestHref(booking: BookingRequest): string {
  if (booking.event_id) {
    return `/events/${booking.event_id}`;
  }

  return `/dm/${booking.conversation_id}`;
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
): BookingGroupChatAccess | null {
  if (!booking.event_id || !currentUserId) {
    return null;
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

    if (booking.status === "cancelled" || booking.status === "declined") {
      return { kind: "hidden" };
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
      return FTC_STATUS_PRIMARY;
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
  const base = `Sent booking request to ${successCount} DJ${successCount === 1 ? "" : "s"}.`;

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
        const conversationId = await sendBookingRequestToDj(recipientId, input);
        return { recipientId, conversationId, error: null as string | null };
      } catch (error) {
        console.error(`Failed to send booking request to ${recipientId}:`, error);
        return {
          recipientId,
          conversationId: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
  );

  const successes: string[] = [];
  const conversationIds: string[] = [];
  const failures: BookingSendFailure[] = [];

  for (const result of results) {
    if (result.conversationId) {
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

  return booking;
}

export async function cancelAcceptedBookingRequest(
  booking: BookingRequest,
  reason: string,
  djDisplayName: string,
): Promise<BookingRequest> {
  const cancelledBooking = await cancelBookingRequest(booking.id, {
    reason,
    previousStatus: "accepted",
  });

  if (cancelledBooking.event_id) {
    await postBookingCancellationGroupChatUpdate(cancelledBooking, djDisplayName);
  }

  return cancelledBooking;
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

  if (booking.status !== "cancelled") {
    console.error(`[bookings] ${rpcName} returned unexpected status:`, booking);
    throw new Error("Archived booking status was not returned correctly.");
  }

  return booking;
}

export async function archiveBookingRequest(bookingId: string): Promise<BookingRequest> {
  const booking = await mutateArchivedBookingRequest(
    "archive_booking_request",
    bookingId,
    "scripts/setupBookingRequestArchiving.sql",
  );

  if (!booking.archived_at) {
    console.error("[bookings] archive_booking_request did not set archived_at:", booking);
    throw new Error("Archived booking timestamp was not returned correctly.");
  }

  return booking;
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

export async function unarchiveBookingRequest(bookingId: string): Promise<BookingRequest> {
  const booking = await mutateArchivedBookingRequest(
    "unarchive_booking_request",
    bookingId,
    "scripts/setupBookingRequestArchiving.sql",
  );

  if (booking.archived_at) {
    console.error("[bookings] unarchive_booking_request still has archived_at:", booking);
    throw new Error("Restored booking still appears archived.");
  }

  return booking;
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

  const booking = data as BookingRequest;

  await createNotification(
    booking.sender_id,
    "booking_update",
    status === "accepted" ? "Booking accepted" : "Booking declined",
    `${booking.event_name} · ${formatStatusLabel(status)}`,
    "/bookings",
  );

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
    fee: normalizeStoredRate(parsed.fee ?? ""),
    notes: parsed.notes === "None" ? "" : parsed.notes ?? "",
    status: normalizeBookingRequestStatus(parsed.status ?? "pending"),
    archived_at: null,
    lineup_hidden_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
  };
}
