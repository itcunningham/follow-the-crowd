import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import type { BookingRequest } from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import {
  countAcceptedCrewDjsForEvent,
  ensureEventCrewChatAutoStarted,
  resolveCrewChatUnlockState,
  shouldPostCrewChatLineupUpdate,
} from "@/lib/events/crewChatUnlock";

export function buildBookingAcceptanceGroupChatMessage(
  memberDisplayName: string,
  options?: { crewChatOpened?: boolean },
): string {
  const trimmedName = memberDisplayName.trim() || "Crew member";

  if (options?.crewChatOpened) {
    return `${trimmedName} joined the event crew. Crew chat is now open.`;
  }

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

  const acceptedCount = await countAcceptedCrewDjsForEvent(booking.event_id);
  const wasUnlockedBefore = resolveCrewChatUnlockState(
    event,
    Math.max(acceptedCount - 1, 0),
  ).isUnlocked;

  await ensureEventCrewChatAutoStarted(booking.event_id);

  const refreshedEvent = (await getEventById(booking.event_id)) ?? event;
  const isUnlockedAfter = resolveCrewChatUnlockState(refreshedEvent, acceptedCount).isUnlocked;

  if (!(await shouldPostCrewChatLineupUpdate(refreshedEvent, acceptedCount))) {
    return;
  }

  const crewChatOpenedNow = !wasUnlockedBefore && isUnlockedAfter;

  await sendEventCrewChatMessage(
    booking.event_id,
    buildBookingAcceptanceGroupChatMessage(memberDisplayName, {
      crewChatOpened: crewChatOpenedNow,
    }),
    booking.event_name,
    { notifyParticipants: options?.notifyParticipants },
  );
}
