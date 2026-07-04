import { supabase } from "@/lib/supabaseClient";
import { parseEventDate } from "@/lib/bookingDateTime";
import { createNotification } from "@/lib/notifications";
import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import { startDm } from "@/lib/startDm";
import { getCurrentUserId } from "@/lib/user/currentUser";

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
};

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
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "declined") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  if (status === "cancelled") {
    return "border-zinc-600/50 bg-zinc-800/80 text-zinc-400";
  }

  return "border-blue-500/40 bg-blue-600/15 text-blue-300";
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
    .select("*")
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
  "id, created_at, sender_id, recipient_id, conversation_id, event_id, event_name, venue, event_date, set_time, fee, notes, status, archived_at, lineup_hidden_at";

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

export async function sendBookingRequestsToDjs(
  recipientIds: string[],
  input: BookingRequestInput,
): Promise<{
  conversationIds: string[];
  successes: string[];
  failures: BookingSendFailure[];
}> {
  const results = await Promise.all(
    recipientIds.map(async (recipientId) => {
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

  return { conversationIds, successes, failures };
}

export async function cancelBookingRequest(bookingId: string): Promise<BookingRequest> {
  const { data, error } = await supabase.rpc("cancel_booking_request", {
    p_booking_id: bookingId,
  });

  if (error) {
    logBookingsLoadError(error);
    throw new Error(getBookingMutationErrorMessage(error));
  }

  if (!data) {
    throw new Error(
      "Could not cancel this booking request. Run scripts/setupBookingCancellation.sql in Supabase.",
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

  await createNotification(
    booking.recipient_id,
    "booking_update",
    "Booking request cancelled",
    `${booking.event_name} at ${booking.venue}`,
    `/dm/${booking.conversation_id}`,
  );

  return booking;
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
): BookingRequest | null {
  if (booking) {
    return booking;
  }

  const parsed = parseBookingRequestMessage(messageText);

  if (!parsed?.eventName) {
    return null;
  }

  return {
    id: parsed.bookingId ?? messageText,
    created_at: new Date().toISOString(),
    sender_id: "",
    recipient_id: "",
    conversation_id: "",
    event_id: null,
    event_name: parsed.eventName,
    venue: parsed.venue ?? "",
    event_date: parsed.eventDate ?? "",
    set_time: parsed.setTime ?? "",
    fee: normalizeStoredRate(parsed.fee ?? ""),
    notes: parsed.notes === "None" ? "" : parsed.notes ?? "",
    status: parsed.status ?? "pending",
    archived_at: null,
    lineup_hidden_at: null,
  };
}
