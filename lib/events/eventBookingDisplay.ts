import type { BookingRequest } from "@/lib/bookingRequests";
import { normalizeStoredRate } from "@/lib/bookingRate";
import type { EventArtworkSnapshot } from "@/lib/events";

export function resolveEventLinkedBookingDisplay(
  booking: BookingRequest,
  eventSnapshot?: EventArtworkSnapshot | null,
): BookingRequest {
  if (!booking.event_id?.trim() || !eventSnapshot) {
    return booking;
  }

  const bookingFee = normalizeStoredRate(booking.fee);
  const snapshotRate = normalizeStoredRate(eventSnapshot.rate);

  return {
    ...booking,
    event_name: eventSnapshot.eventName,
    venue: eventSnapshot.venue,
    event_date: eventSnapshot.eventDate,
    set_time: eventSnapshot.setTime,
    fee: bookingFee || snapshotRate,
  };
}
