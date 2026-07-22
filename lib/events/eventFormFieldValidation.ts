import {
  EVENT_DATE_REQUIRES_PICKER_ERROR,
  getEventDateValidationError,
  getEventSetTimeValidationErrors,
  parseEventDate,
  resolveEventDateKey,
} from "@/lib/bookingDateTime";
import { getTextLengthValidationError } from "@/lib/textInputLimits";

/** Shared 30-character cap for planner event/plan name and venue fields. */
export const PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH = 30;

export const MAX_EVENT_NAME_LENGTH = PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH;
export const MAX_EVENT_VENUE_LENGTH = PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH;
export const MAX_BOOKING_PLAN_NAME_LENGTH = PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH;

export type EventFormFieldErrors = {
  name?: string;
  venue?: string;
  eventDate?: string;
  startTime?: string;
  finishTime?: string;
};

export type EventNameVenueFieldErrors = Pick<EventFormFieldErrors, "name" | "venue">;

function getEventNameFieldError(name: string): string | undefined {
  if (!name.trim()) {
    return "Enter an event name";
  }

  const nameLengthError = getTextLengthValidationError(
    name,
    MAX_EVENT_NAME_LENGTH,
    "Event name",
  );

  return nameLengthError ?? undefined;
}

function getVenueFieldError(venue: string): string | undefined {
  if (!venue.trim()) {
    return "Enter a venue";
  }

  const venueLengthError = getTextLengthValidationError(
    venue,
    MAX_EVENT_VENUE_LENGTH,
    "Venue",
  );

  return venueLengthError ?? undefined;
}

export function getEventNameVenueFieldErrors(input: {
  name: string;
  venue: string;
}): EventNameVenueFieldErrors {
  const errors: EventNameVenueFieldErrors = {};

  const nameError = getEventNameFieldError(input.name);
  if (nameError) {
    errors.name = nameError;
  }

  const venueError = getVenueFieldError(input.venue);
  if (venueError) {
    errors.venue = venueError;
  }

  return errors;
}

export function hasEventNameVenueFieldErrors(errors: EventNameVenueFieldErrors): boolean {
  return Boolean(errors.name || errors.venue);
}

export function getEventFormFieldErrors(input: {
  name: string;
  venue: string;
  eventDate: string;
  setTime: string;
}): EventFormFieldErrors {
  const errors: EventFormFieldErrors = {};

  const nameError = getEventNameFieldError(input.name);
  if (nameError) {
    errors.name = nameError;
  }

  const venueError = getVenueFieldError(input.venue);
  if (venueError) {
    errors.venue = venueError;
  }

  const trimmedDate = input.eventDate.trim();

  if (!trimmedDate) {
    errors.eventDate = "Select an event date";
  } else {
    const parsed = parseEventDate(input.eventDate);
    const dateKey = resolveEventDateKey(input.eventDate);

    if (!dateKey || (parsed.legacyValue && !parsed.isoDate)) {
      errors.eventDate = "Select an event date";
    }
  }

  const setTimeErrors = getEventSetTimeValidationErrors(input.eventDate, input.setTime);

  if (setTimeErrors.start) {
    errors.startTime = setTimeErrors.start;
  }

  if (setTimeErrors.finish) {
    errors.finishTime = setTimeErrors.finish;
  }

  if (!errors.eventDate && !errors.startTime) {
    const scheduleError = getEventDateValidationError(input.eventDate, input.setTime);

    if (scheduleError === EVENT_DATE_REQUIRES_PICKER_ERROR) {
      errors.eventDate = "Select an event date";
    }
  }

  return errors;
}

export function assertEventFormTextFieldLimits(input: { name: string; venue: string }): void {
  const nameLengthError = getTextLengthValidationError(
    input.name,
    MAX_EVENT_NAME_LENGTH,
    "Event name",
  );

  if (nameLengthError) {
    throw new Error(nameLengthError);
  }

  const venueLengthError = getTextLengthValidationError(
    input.venue,
    MAX_EVENT_VENUE_LENGTH,
    "Venue",
  );

  if (venueLengthError) {
    throw new Error(venueLengthError);
  }
}

export function hasEventFormFieldErrors(errors: EventFormFieldErrors): boolean {
  return Boolean(
    errors.name ||
      errors.venue ||
      errors.eventDate ||
      errors.startTime ||
      errors.finishTime,
  );
}
