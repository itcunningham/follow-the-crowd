import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import type { BookingRequest } from "@/lib/bookingRequests";

export function buildBookingAcceptanceGroupChatMessage(
  memberDisplayName: string,
): string {
  const trimmedName = memberDisplayName.trim() || "Crew member";
  return `Booking update: ${trimmedName} accepted and joined the event crew.`;
}

export async function postBookingAcceptanceGroupChatUpdate(
  booking: BookingRequest,
  memberDisplayName: string,
): Promise<void> {
  if (!booking.event_id || booking.status !== "accepted") {
    return;
  }

  await sendEventCrewChatMessage(
    booking.event_id,
    buildBookingAcceptanceGroupChatMessage(memberDisplayName),
    booking.event_name,
  );
}
