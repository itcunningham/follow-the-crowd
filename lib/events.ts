import { parseEventDate } from "@/lib/bookingDateTime";
import type { BookingPlan } from "@/lib/bookingPlans";
import {
  filterActiveBookings,
  getActiveEventLineupStats,
  listBookingRequestsForEvent,
  mapBookingRequestRows,
  type BookingRequest,
  type BookingRequestInput,
} from "@/lib/bookingRequests";
import { normalizeStoredRate } from "@/lib/bookingRate";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import { deleteEventCoverStorageObject } from "@/lib/events/eventCoverImage";
import {
  FTC_STATUS_DANGER,
  FTC_STATUS_MUTED,
  FTC_STATUS_PRIMARY,
} from "@/lib/ftcFlatStatus";
import { getCurrentUserId } from "@/lib/user/currentUser";

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
};

export type EventInput = {
  name: string;
  venue: string;
  eventDate: string;
  setTime: string;
  rate: string;
  notes: string;
  bookingPlanId?: string | null;
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

const EVENT_FIELDS =
  "id, created_at, owner_id, booking_plan_id, name, venue, event_date, set_time, rate, notes, status, cover_image_url";

function mapEventInputToRow(input: EventInput) {
  return {
    name: input.name.trim(),
    venue: input.venue.trim(),
    event_date: input.eventDate.trim(),
    set_time: input.setTime.trim(),
    rate: normalizeStoredRate(input.rate),
    notes: input.notes.trim(),
    booking_plan_id: input.bookingPlanId ?? null,
  };
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eventToRequestInput(event: Event): BookingRequestInput {
  return {
    eventName: event.name,
    venue: event.venue,
    eventDate: event.event_date,
    setTime: event.set_time,
    fee: normalizeStoredRate(event.rate),
    notes: event.notes,
    eventId: event.id,
  };
}

export function eventInputFromBookingPlan(plan: BookingPlan): EventInput {
  return {
    name: plan.event_name,
    venue: plan.venue,
    eventDate: plan.event_date,
    setTime: plan.set_time,
    rate: normalizeStoredRate(plan.fee),
    notes: plan.notes,
    bookingPlanId: plan.id,
  };
}

export function getEventDateDisplayLabel(
  eventDate: string,
  referenceDate: Date = new Date(),
): EventDateDisplayLabel | null {
  const trimmed = eventDate.trim();

  if (!trimmed) {
    return "Unscheduled";
  }

  const parsed = parseEventDate(trimmed);

  if (!parsed.isoDate) {
    return "Unscheduled";
  }

  const todayKey = formatLocalDateKey(referenceDate);

  if (parsed.isoDate > todayKey) {
    return "Upcoming";
  }

  if (parsed.isoDate === todayKey) {
    return "Today";
  }

  return "Past";
}

export function formatEventDateDisplayLabel(eventDate: string): string | null {
  return getEventDateDisplayLabel(eventDate);
}

export function getEventDateDisplayBadgeClass(label: EventDateDisplayLabel): string {
  if (label === "Upcoming") {
    return FTC_STATUS_PRIMARY;
  }

  if (label === "Today") {
    return FTC_STATUS_PRIMARY;
  }

  if (label === "Past") {
    return FTC_STATUS_MUTED;
  }

  return FTC_STATUS_MUTED;
}

export function isEventCancelled(event: Pick<Event, "status">): boolean {
  return event.status === "cancelled";
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

  const statsByEventId = new Map<string, EventLineupStats>();

  await Promise.all(
    events.map(async (event) => {
      try {
        const bookings = await listBookingRequestsForEvent(event.id);
        statsByEventId.set(event.id, getActiveEventLineupStats(bookings));
      } catch (error) {
        console.error(`[events] Failed to load lineup stats for ${event.id}:`, error);
        statsByEventId.set(event.id, { total: 0, pending: 0, accepted: 0, declined: 0 });
      }
    }),
  );

  return events.map((event) => ({
    ...event,
    lineupStats: statsByEventId.get(event.id) ?? { total: 0, pending: 0, accepted: 0, declined: 0 },
  }));
}

export async function listOwnedEvents(): Promise<Event[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_FIELDS)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Event[];
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

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_FIELDS)
    .in("id", eventIds)
    .order("event_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Event[];
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

export async function getEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_FIELDS)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Event | null) ?? null;
}

export async function createEvent(input: EventInput): Promise<Event> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: userId,
      status: "upcoming",
      ...mapEventInputToRow(input),
    })
    .select(EVENT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as Event;
}

export async function updateEvent(eventId: string, input: EventInput): Promise<Event> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("events")
    .update(mapEventInputToRow(input))
    .eq("id", eventId)
    .eq("owner_id", userId)
    .select(EVENT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as Event;
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

  const { data, error } = await supabase
    .from("events")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", eventId)
    .eq("owner_id", userId)
    .select(EVENT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as Event;
}

export async function getEventCoverUrlsByIds(
  eventIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, cover_image_url")
    .in("id", uniqueIds);

  if (error) {
    throw error;
  }

  const coverUrls = new Map<string, string>();

  for (const row of data ?? []) {
    const coverImageUrl = (row as { id: string; cover_image_url: string | null }).cover_image_url;

    if (coverImageUrl?.trim()) {
      coverUrls.set(row.id, coverImageUrl.trim());
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
  await notifyCancelledBookingsFromEventCancellation(result.cancelledBookings);

  return result;
}

export function getEventsLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.code === "42P01" || supabaseError.code === "PGRST205") {
      return "Events table is not set up yet. Run scripts/setupEvents.sql.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load events";
}
