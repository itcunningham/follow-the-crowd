import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import {
  formatPublicCancellationReason,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { getEventById } from "@/lib/events";
import { shouldPostCrewChatLineupUpdate } from "@/lib/events/crewChatUnlock";

export function buildBookingCancellationGroupChatMessage(
  djDisplayName: string,
  cancellationReason: string | null | undefined,
): string {
  const trimmedName = djDisplayName.trim() || "DJ";
  let message = `Booking update: ${trimmedName} is no longer scheduled for this event.`;

  if (cancellationReason?.trim()) {
    message += ` Reason: ${formatPublicCancellationReason(cancellationReason)}.`;
  }

  return message;
}

export async function postBookingCancellationGroupChatUpdate(
  booking: BookingRequest,
  djDisplayName: string,
  cancellationReason?: string | null,
  options?: { remainingAcceptedDjCount?: number },
): Promise<void> {
  if (!booking.event_id) {
    return;
  }

  const event = await getEventById(booking.event_id);

  if (!event) {
    return;
  }

  const remainingAcceptedDjCount = options?.remainingAcceptedDjCount;

  if (
    !(await shouldPostCrewChatLineupUpdate(
      event,
      remainingAcceptedDjCount,
    ))
  ) {
    return;
  }

  const message = buildBookingCancellationGroupChatMessage(
    djDisplayName,
    cancellationReason ?? booking.cancellation_reason,
  );

  await sendEventCrewChatMessage(booking.event_id, message, booking.event_name);
}
