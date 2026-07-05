import type { BookingRequest } from "@/lib/bookingRequests";
import type { EventArtworkSnapshot } from "@/lib/events";

export function resolveEventLinkedBookingDisplay(
  booking: BookingRequest,
  eventSnapshot?: EventArtworkSnapshot | null,
): BookingRequest {
  if (!booking.event_id?.trim() || !eventSnapshot) {
    return booking;
  }

  return {
    ...booking,
    event_name: eventSnapshot.eventName,
    venue: eventSnapshot.venue,
    event_date: eventSnapshot.eventDate,
    set_time: eventSnapshot.setTime,
    fee: eventSnapshot.rate,
  };
}
