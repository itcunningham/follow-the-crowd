import {
  cancelBookingRequest,
  listSentBookingRequests,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { resolveSentBookingsLinkedToPlannerEvent } from "@/lib/calendar";
import type { Event } from "@/lib/events";
import {
  patchEventInEventsListCache,
  removeEventFromEventsListCache,
} from "@/lib/events/eventsListCache";
import { removePlannerCalendarItemsForEvent } from "@/lib/plannerCalendarItemsCache";

export async function listCalendarLinkedSentBookingsForEvent(
  event: Pick<Event, "id" | "name" | "event_date">,
): Promise<BookingRequest[]> {
  const sentBookings = await listSentBookingRequests();
  return resolveSentBookingsLinkedToPlannerEvent(event, sentBookings);
}

export async function cancelCalendarLinkedOrphanSentBookingsForEvent(
  event: Pick<Event, "id" | "name" | "event_date">,
): Promise<BookingRequest[]> {
  const linkedBookings = await listCalendarLinkedSentBookingsForEvent(event);
  const cancelledBookings: BookingRequest[] = [];

  for (const booking of linkedBookings) {
    if (booking.event_id?.trim() || booking.status !== "pending") {
      continue;
    }

    cancelledBookings.push(await cancelBookingRequest(booking.id));
  }

  return cancelledBookings;
}

export function syncPlannerEventsHiddenFromHistoryClientCaches(eventIds: string[]): void {
  for (const eventId of eventIds) {
    removePlannerCalendarItemsForEvent(eventId);
  }
}

export function syncPlannerEventDeletedFromClientCaches(
  eventId: string,
  relatedBookingIds: string[] = [],
): void {
  removeEventFromEventsListCache(true, eventId);
  removePlannerCalendarItemsForEvent(eventId, relatedBookingIds);
}

export function syncPlannerEventCancelledFromClientCaches(
  eventId: string,
  relatedBookingIds: string[] = [],
  updatedEvent?: Event | null,
): void {
  removePlannerCalendarItemsForEvent(eventId, relatedBookingIds);

  if (!updatedEvent) {
    removeEventFromEventsListCache(true, eventId);
    return;
  }

  patchEventInEventsListCache(true, updatedEvent);
}
