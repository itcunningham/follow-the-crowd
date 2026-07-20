import {
  getEventDateValidationError,
  getEventSetTimeValidationError,
  isPlannerEventPast,
  resolveEventDateKey,
  resolveEventStartDateTime,
} from "@/lib/bookingDateTime";
import type { BookingPlan } from "@/lib/bookingPlans";
import {
  getActiveEventLineupStats,
  insertEventCancellationActivityMessagesIfNeeded,
  listBookingRequestsForEvent,
  listBookingRequestsForEventLineupStats,
  mapBookingRequestRows,
  type BookingRequest,
  type BookingRequestInput,
} from "@/lib/bookingRequests";
import { normalizeStoredRate } from "@/lib/bookingRate";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import {
  assertEventCoverImagePersisted,
  deleteEventCoverStorageObject,
  normalizeEventCoverImageUrl,
  uploadEventCoverImage,
  wrapEventCoverSaveError,
} from "@/lib/events/eventCoverImage";
import {
  FTC_STATUS_DANGER,
  FTC_STATUS_MUTED,
  FTC_STATUS_TODAY,
  FTC_STATUS_UPCOMING,
} from "@/lib/ftcFlatStatus";
import { getCurrentUserId } from "@/lib/user/currentUser";
import {
  isEventHistoryHideAvailable,
  isMissingHistoryHiddenAtColumnError,
  normalizeEventRow,
  normalizeEventRows,
  withEventArtworkFieldsFallback,
  withEventFieldsFallback,
} from "@/lib/events/eventQueryFields";

export { isEventHistoryHideAvailable };

export type EventStatus = "draft" | "upcoming" | "completed" | "cancelled";

export type Event = {
  id: string;
  created_at: string;
  owner_id: string;
  booking_plan_id: string | null;
  name: string;
  venue: string;
  event_date: string;
  set_time: string;
  rate: string;
  notes: string;
  status: EventStatus;
  cover_image_url: string | null;
  fallback_colour: string | null;
  crew_chat_started_at: string | null;
  history_hidden_at: string | null;
};

export type EventInput = {
  name: string;
  venue: string;
  eventDate: string;
  setTime: string;
  rate: string;
  notes: string;
  bookingPlanId?: string | null;
  fallbackColour?: string | null;
};

export type EventDateDisplayLabel = "Upcoming" | "Today" | "Past" | "Unscheduled";

export type EventLineupStats = {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
};

export type EventWithLineupStats = Event & {
  lineupStats: EventLineupStats;
};

function mapEventInputToRow(input: EventInput) {
  return {
    name: input.name.trim(),
    venue: input.venue.trim(),
    event_date: input.eventDate.trim(),
    set_time: input.setTime.trim(),
    rate: normalizeStoredRate(input.rate),
    notes: input.notes.trim(),
    booking_plan_id: input.bookingPlanId ?? null,
    fallback_colour: input.fallbackColour?.trim() || null,
  };
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eventFormToRequestInput(
  form: Pick<EventInput, "name" | "venue" | "eventDate" | "setTime" | "notes">,
  eventId: string,
): BookingRequestInput {
  return {
    eventName: form.name,
    venue: form.venue,
    eventDate: form.eventDate,
    setTime: form.setTime,
    fee: "",
    notes: form.notes,
    eventId,
  };
}

export function eventToRequestInput(event: Event): BookingRequestInput {
  return {
    eventName: event.name,
    venue: event.venue,
    eventDate: event.event_date,
    setTime: event.set_time,
    fee: "",
    notes: event.notes,
    eventId: event.id,
  };
}

export function eventInputFromBookingPlan(plan: BookingPlan): EventInput {
  return {
    name: plan.event_name,
    venue: plan.venue,
    eventDate: "",
    setTime: "",
    rate: normalizeStoredRate(plan.fee),
    notes: plan.notes,
    bookingPlanId: plan.id,
  };
}

export function getEventDateDisplayLabel(
  eventDate: string,
  setTime = "",
  referenceDate: Date = new Date(),
): EventDateDisplayLabel | null {
  const trimmed = eventDate.trim();

  if (!trimmed) {
    return "Unscheduled";
  }

  const dateKey = resolveEventDateKey(trimmed);

  if (!dateKey) {
    return "Unscheduled";
  }

  if (isPlannerEventPast(trimmed, setTime, referenceDate)) {
    return "Past";
  }

  const todayKey = formatLocalDateKey(referenceDate);

  if (dateKey > todayKey) {
    return "Upcoming";
  }

  return "Today";
}

export function formatEventDateDisplayLabel(eventDate: string, setTime = ""): string | null {
  return getEventDateDisplayLabel(eventDate, setTime);
}

export function getEventDateDisplayBadgeClass(label: EventDateDisplayLabel): string {
  if (label === "Upcoming") {
    return FTC_STATUS_UPCOMING;
  }

  if (label === "Today") {
    return FTC_STATUS_TODAY;
  }

  if (label === "Past") {
    return FTC_STATUS_MUTED;
  }

  return FTC_STATUS_MUTED;
}

export function isEventCancelled(event: Pick<Event, "status">): boolean {
  return event.status === "cancelled";
}

export function isPlannerEventActive(
  event: Pick<Event, "event_date" | "set_time" | "status">,
  referenceDate: Date = new Date(),
): boolean {
  if (isEventCancelled(event)) {
    return false;
  }

  return !isPlannerEventPast(event.event_date, event.set_time, referenceDate);
}

export function isPlannerEventInHistoryTab(
  event: Pick<Event, "event_date" | "set_time" | "status" | "history_hidden_at">,
  referenceDate: Date = new Date(),
): boolean {
  if (event.history_hidden_at) {
    return false;
  }

  if (isEventCancelled(event)) {
    return true;
  }

  return isPlannerEventPast(event.event_date, event.set_time, referenceDate);
}

export function filterPlannerHistoryTabEvents<
  T extends Pick<Event, "event_date" | "set_time" | "status" | "history_hidden_at">,
>(events: T[]): T[] {
  return events.filter((event) => isPlannerEventInHistoryTab(event));
}

export function isEventVisibleInPlannerHistory(
  event: Pick<Event, "event_date" | "set_time" | "status" | "history_hidden_at">,
  referenceDate: Date = new Date(),
): boolean {
  return isPlannerEventInHistoryTab(event, referenceDate);
}

export function filterVisiblePlannerHistoryEvents<
  T extends Pick<Event, "event_date" | "set_time" | "status" | "history_hidden_at">,
>(events: T[], referenceDate: Date = new Date()): T[] {
  return events.filter((event) => isEventVisibleInPlannerHistory(event, referenceDate));
}

/** Selected History ids that can be hidden via hide_events_from_history (owner History tab rows). */
export function resolvePlannerHistoryHideEventIds<
  T extends Pick<Event, "id" | "event_date" | "set_time" | "status" | "history_hidden_at">,
>(events: T[], selectedIds: string[]): string[] {
  if (selectedIds.length === 0) {
    return [];
  }

  const selectedIdSet = new Set(selectedIds.map((id) => String(id)));

  return events
    .filter(
      (event) =>
        selectedIdSet.has(String(event.id)) && isEventVisibleInPlannerHistory(event),
    )
    .map((event) => String(event.id));
}

type EventStartSortable = Pick<Event, "event_date" | "set_time" | "name">;

function getEventStartSortTimestamp(event: EventStartSortable): number | null {
  const startDateTime = resolveEventStartDateTime(event.event_date, event.set_time);
  return startDateTime?.getTime() ?? null;
}

function compareEventsByStartTime(
  left: EventStartSortable,
  right: EventStartSortable,
  direction: "asc" | "desc",
): number {
  const leftTimestamp = getEventStartSortTimestamp(left);
  const rightTimestamp = getEventStartSortTimestamp(right);

  if (leftTimestamp === null && rightTimestamp === null) {
    return left.name.localeCompare(right.name);
  }

  if (leftTimestamp === null) {
    return direction === "asc" ? 1 : -1;
  }

  if (rightTimestamp === null) {
    return direction === "asc" ? -1 : 1;
  }

  if (leftTimestamp !== rightTimestamp) {
    return direction === "asc"
      ? leftTimestamp - rightTimestamp
      : rightTimestamp - leftTimestamp;
  }

  return left.name.localeCompare(right.name);
}

export function sortEventsByStartAscending<T extends EventStartSortable>(events: T[]): T[] {
  return [...events].sort((left, right) => compareEventsByStartTime(left, right, "asc"));
}

export function sortEventsByStartDescending<T extends EventStartSortable>(events: T[]): T[] {
  return [...events].sort((left, right) => compareEventsByStartTime(left, right, "desc"));
}

export function getEventCancelledBadgeClass(): string {
  return FTC_STATUS_DANGER;
}

export function formatEventStatusLabel(status: EventStatus): string {
  if (status === "upcoming") {
    return "Upcoming";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Draft";
}

export async function attachLineupStats(events: Event[]): Promise<EventWithLineupStats[]> {
  if (events.length === 0) {
    return [];
  }

  const emptyStats: EventLineupStats = { total: 0, pending: 0, accepted: 0, declined: 0 };

  try {
    const bookingsByEventId = await listBookingRequestsForEventLineupStats(
      events.map((event) => event.id),
    );

    return events.map((event) => ({
      ...event,
      lineupStats: getActiveEventLineupStats(bookingsByEventId.get(event.id) ?? []),
    }));
  } catch (error) {
    console.error("[events] Failed to load lineup stats:", error);

    return events.map((event) => ({
      ...event,
      lineupStats: emptyStats,
    }));
  }
}

export async function listOwnedEvents(): Promise<Event[]> {
  const userId = await getCurrentUserId();

  const data = await withEventFieldsFallback((fields) =>
    supabase
      .from("events")
      .select(fields)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
  );

  return normalizeEventRows((data ?? []) as unknown as Record<string, unknown>[]) as Event[];
}

export async function listDjInvitedEvents(): Promise<Event[]> {
  const userId = await getCurrentUserId();

  const { data: bookings, error: bookingsError } = await supabase
    .from("booking_requests")
    .select("event_id")
    .eq("recipient_id", userId)
    .not("event_id", "is", null);

  if (bookingsError) {
    throw bookingsError;
  }

  const eventIds = [
    ...new Set(
      (bookings ?? [])
        .map((row) => row.event_id as string | null)
        .filter((eventId): eventId is string => Boolean(eventId)),
    ),
  ];

  if (eventIds.length === 0) {
    return [];
  }

  const data = await withEventFieldsFallback((fields) =>
    supabase.from("events").select(fields).in("id", eventIds).order("event_date", {
      ascending: true,
    }),
  );

  return normalizeEventRows((data ?? []) as unknown as Record<string, unknown>[]) as Event[];
}

export async function hasDjEventInvites(userId?: string): Promise<boolean> {
  const currentUserId = userId ?? (await getCurrentUserId());

  const { count, error } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", currentUserId)
    .not("event_id", "is", null);

  if (error) {
    console.error("[events] Failed to check DJ event invites:", error);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function getEventOwnerId(eventId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id, owner_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || typeof data.owner_id !== "string" || !data.owner_id.trim()) {
    return null;
  }

  return data.owner_id;
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const data = await withEventFieldsFallback((fields) =>
    supabase.from("events").select(fields).eq("id", eventId).maybeSingle(),
  );

  if (!data) {
    return null;
  }

  return normalizeEventRow(data as unknown as Record<string, unknown>) as Event;
}

function assertEventStartNotInPast(input: EventInput): void {
  const setTimeValidationError = getEventSetTimeValidationError(input.setTime);

  if (setTimeValidationError) {
    throw new Error(setTimeValidationError);
  }

  const validationError = getEventDateValidationError(input.eventDate, input.setTime);

  if (validationError) {
    throw new Error(validationError);
  }
}

export async function createEvent(input: EventInput): Promise<Event> {
  assertEventStartNotInPast(input);
  const userId = await getCurrentUserId();

  const data = await withEventFieldsFallback((fields) =>
    supabase
      .from("events")
      .insert({
        owner_id: userId,
        status: "upcoming",
        ...mapEventInputToRow(input),
      })
      .select(fields)
      .single(),
  );

  return normalizeEventRow(data as unknown as Record<string, unknown>) as Event;
}

export async function updateEvent(eventId: string, input: EventInput): Promise<Event> {
  assertEventStartNotInPast(input);
  const userId = await getCurrentUserId();

  const data = await withEventFieldsFallback((fields) =>
    supabase
      .from("events")
      .update(mapEventInputToRow(input))
      .eq("id", eventId)
      .eq("owner_id", userId)
      .select(fields)
      .single(),
  );

  return normalizeEventRow(data as unknown as Record<string, unknown>) as Event;
}

export type EventCoverChange = {
  file?: File | null;
  removeExisting?: boolean;
};

export async function updateEventWithCover(
  eventId: string,
  input: EventInput,
  coverChange: EventCoverChange,
  previousCoverUrl?: string | null,
): Promise<Event> {
  const normalizedPreviousCoverUrl = normalizeEventCoverImageUrl(previousCoverUrl);

  if (coverChange.removeExisting) {
    try {
      const clearedEvent = await updateEventCoverImageUrl(eventId, null);
      assertEventCoverImagePersisted(clearedEvent, null);
      await deleteEventCoverStorageObject(normalizedPreviousCoverUrl);
    } catch (error) {
      throw wrapEventCoverSaveError("events.update cover_image_url clear", error);
    }
  } else if (coverChange.file) {
    let uploadedPublicUrl: string;

    try {
      uploadedPublicUrl = await uploadEventCoverImage(eventId, coverChange.file);
    } catch (error) {
      throw wrapEventCoverSaveError("storage.objects insert event-covers", error);
    }

    try {
      const savedCoverEvent = await updateEventCoverImageUrl(eventId, uploadedPublicUrl);
      assertEventCoverImagePersisted(savedCoverEvent, uploadedPublicUrl);
      await deleteEventCoverStorageObject(normalizedPreviousCoverUrl);
    } catch (error) {
      throw wrapEventCoverSaveError("events.update cover_image_url", error);
    }
  }

  try {
    await updateEvent(eventId, input);
  } catch (error) {
    throw wrapEventCoverSaveError("events.update fields", error);
  }

  let refreshed: Event | null;

  try {
    refreshed = await getEventById(eventId);
  } catch (error) {
    throw wrapEventCoverSaveError("events.select after save", error);
  }

  if (!refreshed) {
    throw new Error("Event not found after save.");
  }

  if (coverChange.file) {
    const persistedCoverUrl = normalizeEventCoverImageUrl(refreshed.cover_image_url);

    if (!persistedCoverUrl) {
      throw new Error(
        "Flyer upload completed but cover_image_url is still empty on the event row. Run scripts/setupEventCoverImage.sql and scripts/supabaseReloadPostgrest.sql in Supabase, then try again.",
      );
    }
  }

  if (coverChange.removeExisting && normalizeEventCoverImageUrl(refreshed.cover_image_url)) {
    throw new Error("Flyer removal completed but cover_image_url is still set on the event row.");
  }

  return refreshed;
}

export async function eventHasBookingRequests(eventId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

export async function updateEventCoverImageUrl(
  eventId: string,
  coverImageUrl: string | null,
): Promise<Event> {
  const userId = await getCurrentUserId();
  const normalizedCoverImageUrl = normalizeEventCoverImageUrl(coverImageUrl);

  const data = await withEventFieldsFallback((fields) =>
    supabase
      .from("events")
      .update({ cover_image_url: normalizedCoverImageUrl })
      .eq("id", eventId)
      .eq("owner_id", userId)
      .select(fields)
      .single(),
  );

  const updatedEvent = normalizeEventRow(data as unknown as Record<string, unknown>) as Event;

  assertEventCoverImagePersisted(updatedEvent, normalizedCoverImageUrl);

  return updatedEvent;
}

export type EventArtworkSnapshot = {
  eventName: string;
  venue: string;
  eventDate: string;
  setTime: string;
  rate: string;
  coverImageUrl: string | null;
  fallbackColour: string | null;
  status: EventStatus;
  crewChatStartedAt: string | null;
};

export async function getEventArtworkByIds(
  eventIds: string[],
): Promise<Map<string, EventArtworkSnapshot>> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const data = await withEventArtworkFieldsFallback((fields) =>
    supabase.from("events").select(fields).in("id", uniqueIds),
  );

  const artworkById = new Map<string, EventArtworkSnapshot>();

  for (const row of (data ?? []) as unknown[]) {
    const eventRow = row as {
      id: string;
      name: string;
      venue: string;
      event_date: string;
      set_time: string;
      rate: string;
      cover_image_url: string | null;
      fallback_colour: string | null;
      status: EventStatus;
      crew_chat_started_at?: string | null;
    };

    artworkById.set(eventRow.id, {
      eventName: eventRow.name.trim() || "Untitled event",
      venue: eventRow.venue,
      eventDate: eventRow.event_date,
      setTime: eventRow.set_time,
      rate: eventRow.rate,
      coverImageUrl: normalizeEventCoverImageUrl(eventRow.cover_image_url),
      fallbackColour: eventRow.fallback_colour?.trim() || null,
      status: eventRow.status,
      crewChatStartedAt: eventRow.crew_chat_started_at ?? null,
    });
  }

  return artworkById;
}

export async function getEventCoverUrlsByIds(
  eventIds: string[],
): Promise<Map<string, string>> {
  const artworkById = await getEventArtworkByIds(eventIds);
  const coverUrls = new Map<string, string>();

  for (const [eventId, artwork] of artworkById) {
    if (artwork.coverImageUrl) {
      coverUrls.set(eventId, artwork.coverImageUrl);
    }
  }

  return coverUrls;
}

export async function deleteEmptyEvent(
  eventId: string,
  coverImageUrl?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("delete_empty_event", {
    p_event_id: eventId,
  });

  if (error) {
    console.error("[events] delete_empty_event failed:", {
      eventId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  await deleteEventCoverStorageObject(coverImageUrl);
}

export type CancelEventResult = {
  event: Event;
  cancelledBookings: BookingRequest[];
};

function parseCancelEventRpcResult(data: unknown): CancelEventResult {
  if (!data || typeof data !== "object") {
    throw new Error("Could not cancel event. Run scripts/setupEventLifecycle.sql in Supabase.");
  }

  const payload = data as Record<string, unknown>;

  if (payload.event && typeof payload.event === "object") {
    const event = payload.event as Event;
    const cancelledBookings = mapBookingRequestRows(
      Array.isArray(payload.cancelled_bookings) ? payload.cancelled_bookings : [],
    );

    if (event.status !== "cancelled") {
      console.error("[events] cancel_event returned unexpected status:", event);
      throw new Error("Event status was not updated to cancelled.");
    }

    return { event, cancelledBookings };
  }

  const legacyEvent = data as Event;

  if (legacyEvent.status !== "cancelled") {
    console.error("[events] cancel_event returned unexpected status:", legacyEvent);
    throw new Error("Event status was not updated to cancelled.");
  }

  return {
    event: legacyEvent,
    cancelledBookings: [],
  };
}

async function notifyCancelledBookingsFromEventCancellation(
  cancelledBookings: BookingRequest[],
): Promise<void> {
  await Promise.all(
    cancelledBookings.map(async (booking) => {
      if (!booking.recipient_id || !booking.conversation_id) {
        return;
      }

      try {
        await createNotification(
          booking.recipient_id,
          "booking_update",
          "Booking request cancelled",
          `${booking.event_name} at ${booking.venue}`,
          `/dm/${booking.conversation_id}`,
        );
      } catch (notificationError) {
        console.error(
          "[events] Failed to notify DJ of event cancellation:",
          booking.id,
          notificationError,
        );
      }
    }),
  );
}

export async function cancelEvent(eventId: string): Promise<CancelEventResult> {
  const { data, error } = await supabase.rpc("cancel_event", {
    p_event_id: eventId,
  });

  if (error) {
    console.error("[events] cancel_event failed:", {
      eventId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  const result = parseCancelEventRpcResult(data);

  try {
    const eventBookings = await listBookingRequestsForEvent(eventId);
    await insertEventCancellationActivityMessagesIfNeeded({
      eventName: result.event.name,
      plannerUserId: result.event.owner_id,
      bookings: eventBookings,
    });
  } catch (activityError) {
    console.error("[events] Failed to insert event-cancellation activity DM messages:", activityError);
  }

  await notifyCancelledBookingsFromEventCancellation(result.cancelledBookings);

  return result;
}

export type EventHistoryHideFailure = {
  eventId: string;
  message: string;
};

function isMissingEventHistoryHideRpcError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as { code?: string; message?: string };

  return (
    supabaseError.code === "PGRST202" ||
    supabaseError.code === "42883" ||
    String(supabaseError.message ?? "").includes("hide_events_from_history") ||
    String(supabaseError.message ?? "").includes("hide_event_from_history")
  );
}

function isInternalDatabaseMessage(message: string): boolean {
  return (
    /\.sql/i.test(message) ||
    /supabase\/migrations/i.test(message) ||
    /scripts\//i.test(message) ||
    /PGRST/i.test(message) ||
    /42703/i.test(message) ||
    /function public\./i.test(message) ||
    /hide_events_from_history/i.test(message) ||
    /hide_event_from_history/i.test(message)
  );
}

export function getEventHistoryHideErrorMessage(error: unknown): string {
  if (isMissingEventHistoryHideRpcError(error) || isMissingHistoryHiddenAtColumnError(error)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[events] Event history hide is unavailable. Apply supabase/migrations/20250710120000_event_history_hide.sql before deploying this feature.",
      );
    }

    return "Remove from history is unavailable right now. Please try again later.";
  }

  if (
    error instanceof Error &&
    error.message.trim() &&
    !isInternalDatabaseMessage(error.message)
  ) {
    return error.message;
  }

  return "Could not remove selected events from history.";
}

function normalizeHistoryHideEventId(value: unknown): string {
  return String(value).trim().toLowerCase();
}

function parseHideEventsFromHistoryUpdatedIds(data: unknown): string[] {
  const rawUpdated = (data as { updated_ids?: unknown } | null)?.updated_ids;

  if (!Array.isArray(rawUpdated)) {
    return [];
  }

  return rawUpdated.map((value) => String(value));
}

export async function hideEventsFromHistory(
  eventIds: string[],
): Promise<{
  successes: string[];
  failures: EventHistoryHideFailure[];
}> {
  if (eventIds.length === 0) {
    return { successes: [], failures: [] };
  }

  const { data, error } = await supabase.rpc("hide_events_from_history", {
    p_event_ids: eventIds,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[events] hide_events_from_history RPC error:", error);
    }

    throw new Error(getEventHistoryHideErrorMessage(error));
  }

  const updatedIds = parseHideEventsFromHistoryUpdatedIds(data);
  const updatedIdSet = new Set(updatedIds.map((id) => normalizeHistoryHideEventId(id)));

  if (
    process.env.NODE_ENV !== "production" &&
    eventIds.length > 0 &&
    updatedIdSet.size === 0
  ) {
    console.error("[events] hide_events_from_history returned no updated_ids:", {
      data,
      eventIds,
    });
  }

  const successes = eventIds.filter((eventId) =>
    updatedIdSet.has(normalizeHistoryHideEventId(eventId)),
  );
  const failures: EventHistoryHideFailure[] = [];

  for (const eventId of eventIds) {
    if (!updatedIdSet.has(normalizeHistoryHideEventId(eventId))) {
      failures.push({
        eventId,
        message: "Event could not be removed from history.",
      });
    }
  }

  return { successes, failures };
}

export function getEventsLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.code === "22P02") {
      return "Event not found or you do not have access.";
    }

    if (supabaseError.code === "42P01" || supabaseError.code === "PGRST205") {
      return "Events table is not set up yet. Run scripts/setupEvents.sql.";
    }

    if (
      supabaseError.code === "42703" &&
      supabaseError.message?.includes("crew_chat_started_at")
    ) {
      return "Database update required. Run scripts/setupEventCrewChatUnlock.sql in Supabase SQL Editor, then try again.";
    }

    if (supabaseError.message) {
      return "Failed to load events.";
    }
  }

  return error instanceof Error ? error.message : "Failed to load events";
}
