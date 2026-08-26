import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import { formatDisplayEventDate } from "@/lib/bookingDateTime";
import { sendEventCrewChatMessage } from "@/lib/eventCrewChat";
import type { Event, EventInput } from "@/lib/events";
import { shouldConfirmEventEditSave } from "@/lib/events/eventEditConfirmation";
import { EVENT_GROUP_CHAT_UPDATE_PREFIX } from "@/lib/events/eventGroupChatUpdateMessage";
import type { BookingRequest } from "@/lib/bookingRequests";
import { createNotification, formatNotificationPreview } from "@/lib/notifications";

export type BookingImpactingEventFieldChange = {
  label: string;
  from: string;
  to: string;
};

function displayDateValue(value: string): string {
  const formatted = formatDisplayEventDate(value);
  return formatted || "Not set";
}

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
      from: displayDateValue(event.event_date),
      to: displayDateValue(input.eventDate),
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

  return `${EVENT_GROUP_CHAT_UPDATE_PREFIX}\n${lines.join("\n")}`;
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

  // Push for this edit is sent independently by
  // notifyConfirmedDjsOfEventScheduleChange, which works whether or not crew
  // chat is unlocked — this call only posts the visible record in the thread
  // for events where crew chat happens to already be open.
  await sendEventCrewChatMessage(eventId, text, eventName, { notifyParticipants: false });
}

// Of the fields getBookingImpactingEventFieldChanges tracks, only these
// materially change what a confirmed DJ needs to know/do next. Event name
// and rate are excluded here: name is cosmetic to the DJ, and rate changes
// on an already-accepted booking go through the rate-proposal notification
// path instead, not this one.
const DJ_FACING_SCHEDULE_FIELD_LABELS = new Set(["Date", "Set time", "Venue"]);

export function selectDjFacingScheduleChanges(
  changes: BookingImpactingEventFieldChange[],
): BookingImpactingEventFieldChange[] {
  return changes.filter((change) => DJ_FACING_SCHEDULE_FIELD_LABELS.has(change.label));
}

export function formatEventScheduleChangeSummary(
  changes: BookingImpactingEventFieldChange[],
): string {
  return changes
    .map((change) =>
      change.label === "Set time" ? `Time changed to ${change.to}` : `${change.label} changed to ${change.to}`,
    )
    .join(" · ");
}

/**
 * Notify every confirmed (accepted) DJ on this event when the date, set
 * time, or venue changes — independently of crew chat, so it still reaches
 * a single confirmed DJ on an event where crew chat is locked or was never
 * manually started.
 */
export async function notifyConfirmedDjsOfEventScheduleChange(
  eventName: string,
  changes: BookingImpactingEventFieldChange[],
  confirmedBookings: BookingRequest[],
): Promise<void> {
  const scheduleChanges = selectDjFacingScheduleChanges(changes);

  if (scheduleChanges.length === 0) {
    return;
  }

  const title = `${eventName} · Event updated`;
  const body = formatNotificationPreview(formatEventScheduleChangeSummary(scheduleChanges));

  await Promise.all(
    confirmedBookings
      .filter((booking) => booking.status === "accepted" && booking.conversation_id)
      .map(async (booking) => {
        try {
          await createNotification(
            booking.recipient_id,
            "message",
            title,
            body,
            `/dm/${booking.conversation_id}`,
          );
        } catch (notificationError) {
          console.error(
            "[events] Failed to notify DJ of event schedule change:",
            booking.id,
            notificationError,
          );
        }
      }),
  );
}
