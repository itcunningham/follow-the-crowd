import type { InboxMessage } from "@/lib/dmInbox";
import {
  formatBookingMessagePreview,
  formatBookingStatusPreview,
  formatEventCancelledInboxPreview,
  isBookingActivityDmMessage,
  isBookingAcceptedDmMessage,
  isBookingRequestMessage,
  parseBookingActivityBookingId,
  parseBookingAcceptanceActivityEventName,
  parseEventCancellationActivityEventName,
  parseBookingRequestMessage,
  BOOKING_ACCEPTED_DM_PREFIX,
  type BookingRequest,
} from "@/lib/bookingRequests";

function resolveLiveConversationBooking(
  bookings: BookingRequest[],
): BookingRequest | null {
  if (bookings.length === 0) {
    return null;
  }

  const accepted = bookings.filter((booking) => booking.status === "accepted");

  if (accepted.length > 0) {
    return accepted[accepted.length - 1] ?? null;
  }

  const pending = bookings.filter((booking) => booking.status === "pending");

  if (pending.length > 0) {
    return pending[pending.length - 1] ?? null;
  }

  return bookings[bookings.length - 1] ?? null;
}

function isStaleBookingCancellationActivity(
  messageText: string,
  bookings: BookingRequest[],
): boolean {
  const activityBookingId = parseBookingActivityBookingId(messageText);

  if (!activityBookingId) {
    return false;
  }

  const referencedBooking = bookings.find((booking) => booking.id === activityBookingId);

  if (referencedBooking) {
    return referencedBooking.status !== "cancelled";
  }

  const liveBooking = resolveLiveConversationBooking(bookings);

  return liveBooking?.status === "accepted" || liveBooking?.status === "pending";
}

export function pickDmInboxPreviewMessage(
  messages: InboxMessage[],
  conversationId: string,
  bookings: BookingRequest[] = [],
): InboxMessage | null {
  const conversationMessages = messages
    .filter((message) => message.conversation_id === conversationId)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );

  for (const message of conversationMessages) {
    if (
      isBookingActivityDmMessage(message.text) &&
      isStaleBookingCancellationActivity(message.text, bookings)
    ) {
      continue;
    }

    return message;
  }

  return conversationMessages[0] ?? null;
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

  return resolveLiveConversationBooking(bookings);
}

function formatBookingActivityInboxPreview(
  messageText: string,
  bookings: BookingRequest[],
): string {
  const trimmed = messageText.trim();
  const eventCancelledName = parseEventCancellationActivityEventName(trimmed);

  if (eventCancelledName) {
    return formatEventCancelledInboxPreview(eventCancelledName);
  }

  const acceptedEventName = parseBookingAcceptanceActivityEventName(trimmed);

  if (acceptedEventName) {
    return formatBookingStatusPreview("accepted", acceptedEventName);
  }

  const activityBookingId = parseBookingActivityBookingId(trimmed);

  if (activityBookingId) {
    const referencedBooking = bookings.find((booking) => booking.id === activityBookingId);

    if (referencedBooking) {
      return formatBookingStatusPreview(
        referencedBooking.status,
        referencedBooking.event_name,
      );
    }
  }

  const liveBooking = resolveLiveConversationBooking(bookings);

  if (liveBooking) {
    return formatBookingStatusPreview(liveBooking.status, liveBooking.event_name);
  }

  return formatBookingStatusPreview("cancelled");
}

export function formatDmInboxMessagePreview(
  messageText: string | null | undefined,
  options?: { bookings?: BookingRequest[] },
): string | null {
  const trimmed = messageText?.trim();

  if (!trimmed) {
    return null;
  }

  const bookings = options?.bookings ?? [];

  if (isBookingRequestMessage(trimmed)) {
    return formatBookingMessagePreview(
      trimmed,
      findBookingForMessage(trimmed, bookings),
      { bookings },
    );
  }

  if (isBookingActivityDmMessage(trimmed)) {
    return formatBookingActivityInboxPreview(trimmed, bookings);
  }

  if (isBookingAcceptedDmMessage(trimmed)) {
    const acceptedEventName = trimmed.slice(BOOKING_ACCEPTED_DM_PREFIX.length).trim();

    return formatBookingStatusPreview("accepted", acceptedEventName);
  }

  return trimmed;
}

export function isDmInboxSystemPreviewMessage(
  messageText: string | null | undefined,
): boolean {
  const trimmed = messageText?.trim();

  if (!trimmed) {
    return false;
  }

  return (
    isBookingRequestMessage(trimmed) ||
    isBookingActivityDmMessage(trimmed) ||
    isBookingAcceptedDmMessage(trimmed)
  );
}
