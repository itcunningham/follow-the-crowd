import { supabase } from "@/lib/supabaseClient";
import type { BookingPlan } from "@/lib/bookingPlans";
import type { BookingRequestInput } from "@/lib/bookingRequests";
import { getEventLineupStats, listBookingRequestsForEvent } from "@/lib/bookingRequests";
import { normalizeStoredRate } from "@/lib/bookingRate";
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
};

export type EventInput = {
  name: string;
  venue: string;
  eventDate: string;
  setTime: string;
  rate: string;
  notes: string;
  status: EventStatus;
  bookingPlanId?: string | null;
};

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
  "id, created_at, owner_id, booking_plan_id, name, venue, event_date, set_time, rate, notes, status";

function mapEventInputToRow(input: EventInput) {
  return {
    name: input.name.trim(),
    venue: input.venue.trim(),
    event_date: input.eventDate.trim(),
    set_time: input.setTime.trim(),
    rate: normalizeStoredRate(input.rate),
    notes: input.notes.trim(),
    status: input.status,
    booking_plan_id: input.bookingPlanId ?? null,
  };
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
    status: "draft",
    bookingPlanId: plan.id,
  };
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
        statsByEventId.set(event.id, getEventLineupStats(bookings));
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
