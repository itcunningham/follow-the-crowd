import {
  formatBookingMessagePreview,
  isBookingActivityDmMessage,
  isBookingRequestMessage,
  parseBookingActivityBookingId,
  parseEventCancellationActivityEventName,
  parseBookingRequestMessage,
  formatBookingStatusPreview,
  formatEventCancelledInboxPreview,
  type BookingRequest,
} from "@/lib/bookingRequests";

export function formatDmInboxMessagePreview(
  messageText: string | null | undefined,
  options?: { bookings?: BookingRequest[] },
): string | null {
  const trimmed = messageText?.trim();

  if (!trimmed) {
    return null;
  }

  if (isBookingRequestMessage(trimmed)) {
    return formatBookingMessagePreview(trimmed, findBookingForMessage(trimmed, options?.bookings));
  }

  if (isBookingActivityDmMessage(trimmed)) {
    const eventCancelledName = parseEventCancellationActivityEventName(trimmed);

    if (eventCancelledName) {
      return formatEventCancelledInboxPreview(eventCancelledName);
    }

    const activityBookingId = parseBookingActivityBookingId(trimmed);
    const booking =
      activityBookingId && options?.bookings?.length
        ? options.bookings.find((item) => item.id === activityBookingId) ?? null
        : null;

    return formatBookingStatusPreview("cancelled", booking?.event_name);
  }

  return trimmed;
}

function findBookingForMessage(
  messageText: string,
  bookings: BookingRequest[] | undefined,
): BookingRequest | null {
  if (!bookings?.length) {
    return null;
  }

  const parsed = parseBookingRequestMessage(messageText);

  if (!parsed) {
    return null;
  }

  if (parsed.bookingId) {
    const byId = bookings.find((booking) => booking.id === parsed.bookingId);

    if (byId) {
      return byId;
    }
  }

  if (parsed.eventName) {
    return (
      bookings.find(
        (booking) =>
          booking.event_name === parsed.eventName &&
          (!parsed.eventDate || booking.event_date === parsed.eventDate),
      ) ?? null
    );
  }

  return null;
}
