import type { BookingRequest } from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import { ensureEventCrewChatAutoStarted } from "@/lib/events/crewChatUnlock";

/**
 * Opens the crew chat when a booking is accepted.
 *
 * This used to also post "{name} joined the event crew. Crew chat is now open."
 * and "Booking update: {name} accepted and joined the event crew." into the
 * chat. Both are gone: a crew chat that opens with a list of arrivals reads as
 * an activity feed, and the header's member avatars and count already say who
 * is in the crew. The conversation now begins with the first thing a human
 * actually says.
 *
 * The unlock is untouched — accepting still creates and opens the chat. Every
 * other booking side effect (booking notifications, DM activity messages,
 * status changes) belongs to the caller and is unaffected; the only delivery
 * that stops is the push for a message that is no longer written.
 */
export async function postBookingAcceptanceGroupChatUpdate(
  booking: BookingRequest,
): Promise<void> {
  if (!booking.event_id || booking.status !== "accepted") {
    return;
  }

  const event = await getEventById(booking.event_id);

  if (!event) {
    return;
  }

  await ensureEventCrewChatAutoStarted(booking.event_id);
}
