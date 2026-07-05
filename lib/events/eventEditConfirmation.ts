import { normalizeStoredRate } from "@/lib/bookingRate";
import type { BookingRequest } from "@/lib/bookingRequests";
import type { Event, EventInput } from "@/lib/events";

export function eventHasPendingOrAcceptedBookings(bookings: BookingRequest[]): boolean {
  return bookings.some(
    (booking) => booking.status === "pending" || booking.status === "accepted",
  );
}

export function hasBookingImpactingEventChanges(
  event: Pick<Event, "name" | "venue" | "event_date" | "set_time" | "rate">,
  input: EventInput,
): boolean {
  if (event.name.trim() !== input.name.trim()) {
    return true;
  }

  if (event.venue.trim() !== input.venue.trim()) {
    return true;
  }

  if (event.event_date.trim() !== input.eventDate.trim()) {
    return true;
  }

  if (event.set_time.trim() !== input.setTime.trim()) {
    return true;
  }

  if (normalizeStoredRate(event.rate) !== normalizeStoredRate(input.rate)) {
    return true;
  }

  return false;
}

export function shouldConfirmEventEditSave(
  event: Pick<Event, "name" | "venue" | "event_date" | "set_time" | "rate">,
  input: EventInput,
  bookings: BookingRequest[],
): boolean {
  return (
    eventHasPendingOrAcceptedBookings(bookings) &&
    hasBookingImpactingEventChanges(event, input)
  );
}
