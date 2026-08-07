import type { BookingRequest } from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import { ensureEventCrewChatAutoStarted } from "@/lib/events/crewChatUnlock";
import { notifyCrewChatStarted } from "@/lib/eventCrewChat";

/**
 * Opens the crew chat when a booking is accepted.
 *
 * This used to also post "{name} joined the event crew. Crew chat is now open."
 * and "Booking update: {name} accepted and joined the event crew." into the
 * chat. Those roster lines are gone — arrivals read as an activity feed, and
 * the header already shows who is in the crew.
 *
 * When auto-start actually flips `crew_chat_started_at` for the first time,
 * `notifyCrewChatStarted` posts a single "Crew chat started" system notice
 * (so Crew Chats can show unread), notifies other members, and lets their
 * inbox refetch without a hard refresh.
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

  const wasStarted = Boolean(event.crew_chat_started_at?.trim());
  const updated = await ensureEventCrewChatAutoStarted(booking.event_id);

  if (!wasStarted && updated?.crew_chat_started_at) {
    await notifyCrewChatStarted({
      eventId: booking.event_id,
      eventName: event.name,
    });
  }
}
