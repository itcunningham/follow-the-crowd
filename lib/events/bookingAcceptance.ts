import type { BookingRequest } from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import { ensureEventCrewChatAutoStarted } from "@/lib/events/crewChatUnlock";
import { notifyCrewChatStarted, notifyCrewMemberJoined } from "@/lib/eventCrewChat";

/**
 * After a booking is accepted: unlock crew chat when needed, then signal crew.
 *
 * - First unlock (auto-start on 2nd accept): `notifyCrewChatStarted` + join
 *   pill for the accepting DJ (join push skipped — start already notified).
 * - Later accepts into an open crew: `{name} joined the crew` pill + notify
 *   other DJs only (not planner, not joiner).
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
  const isUnlocked = Boolean(updated?.crew_chat_started_at?.trim());

  if (!isUnlocked) {
    return;
  }

  const justStarted = !wasStarted && isUnlocked;
  const ownerId = event.owner_id?.trim() || "";

  if (justStarted) {
    await notifyCrewChatStarted({
      eventId: booking.event_id,
      eventName: event.name,
    });
  }

  if (!ownerId) {
    return;
  }

  await notifyCrewMemberJoined({
    eventId: booking.event_id,
    eventName: event.name,
    ownerId,
    // Auto-start already pushed "Crew chat started" to other members.
    skipNotification: justStarted,
  });
}
