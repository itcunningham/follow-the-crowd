import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import type { Event, EventInput } from "@/lib/events";
import { shouldConfirmEventEditSave } from "@/lib/events/eventEditConfirmation";
import type { BookingRequest } from "@/lib/bookingRequests";

export type BookingImpactingEventFieldChange = {
  label: string;
  from: string;
  to: string;
};

function displayTextValue(value: string): string {
  const trimmed = value.trim();
  return trimmed || "Not set";
}

function displayRateValue(value: string): string {
  const formatted = formatRateDisplay(value);
  return formatted === "$" ? "Not set" : formatted;
}

export function getBookingImpactingEventFieldChanges(
  event: Pick<Event, "name" | "venue" | "event_date" | "set_time" | "rate">,
  input: EventInput,
): BookingImpactingEventFieldChange[] {
  const changes: BookingImpactingEventFieldChange[] = [];

  if (event.name.trim() !== input.name.trim()) {
    changes.push({
      label: "Event name",
      from: displayTextValue(event.name),
      to: displayTextValue(input.name),
    });
  }

  if (event.venue.trim() !== input.venue.trim()) {
    changes.push({
      label: "Venue",
      from: displayTextValue(event.venue),
      to: displayTextValue(input.venue),
    });
  }

  if (event.event_date.trim() !== input.eventDate.trim()) {
    changes.push({
      label: "Date",
      from: displayTextValue(event.event_date),
      to: displayTextValue(input.eventDate),
    });
  }

  if (event.set_time.trim() !== input.setTime.trim()) {
    changes.push({
      label: "Set time",
      from: displayTextValue(event.set_time),
      to: displayTextValue(input.setTime),
    });
  }

  if (normalizeStoredRate(event.rate) !== normalizeStoredRate(input.rate)) {
    changes.push({
      label: "Rate",
      from: displayRateValue(event.rate),
      to: displayRateValue(input.rate),
    });
  }

  return changes;
}

export function formatEventGroupChatUpdateMessage(
  changes: BookingImpactingEventFieldChange[],
): string {
  if (changes.length === 0) {
    return "";
  }

  const lines = changes.map(
    (change) => `• ${change.label}: ${change.from} → ${change.to}`,
  );

  return `Event details updated:\n${lines.join("\n")}`;
}

export function shouldPostEventGroupChatUpdate(
  event: Pick<Event, "name" | "venue" | "event_date" | "set_time" | "rate">,
  input: EventInput,
  bookings: BookingRequest[],
): boolean {
  return shouldConfirmEventEditSave(event, input, bookings);
}

export async function postEventGroupChatUpdate(
  eventId: string,
  eventName: string,
  changes: BookingImpactingEventFieldChange[],
): Promise<void> {
  const text = formatEventGroupChatUpdateMessage(changes);

  if (!text) {
    return;
  }

  await sendEventCrewChatMessage(eventId, text, eventName);
}
