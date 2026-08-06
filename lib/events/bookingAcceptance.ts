import type { BookingRequest } from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import { ensureEventCrewChatAutoStarted } from "@/lib/events/crewChatUnlock";
import { notifyCrewChatStarted } from "@/lib/eventCrewChat";

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
 *
 * When auto-start actually flips `crew_chat_started_at` for the first time,
 * we still notify other crew members so their Crew Chats inbox refetches
 * without a hard refresh.
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
