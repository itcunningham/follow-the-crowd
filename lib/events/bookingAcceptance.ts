import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import type { BookingRequest } from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import {
  ensureEventCrewChatAutoStarted,
  shouldPostCrewChatLineupUpdate,
} from "@/lib/events/crewChatUnlock";

export function buildBookingAcceptanceGroupChatMessage(
  memberDisplayName: string,
): string {
  const trimmedName = memberDisplayName.trim() || "Crew member";
  return `Booking update: ${trimmedName} accepted and joined the event crew.`;
}

export async function postBookingAcceptanceGroupChatUpdate(
  booking: BookingRequest,
  memberDisplayName: string,
  options?: { notifyParticipants?: boolean },
): Promise<void> {
  if (!booking.event_id || booking.status !== "accepted") {
    return;
  }

  const event = await getEventById(booking.event_id);

  if (!event) {
    return;
  }

  await ensureEventCrewChatAutoStarted(booking.event_id);

  const refreshedEvent = (await getEventById(booking.event_id)) ?? event;

  if (!(await shouldPostCrewChatLineupUpdate(refreshedEvent))) {
    return;
  }

  await sendEventCrewChatMessage(
    booking.event_id,
    buildBookingAcceptanceGroupChatMessage(memberDisplayName),
    booking.event_name,
    { notifyParticipants: options?.notifyParticipants },
  );
}
