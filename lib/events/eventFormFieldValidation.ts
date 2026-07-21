import {
  EVENT_DATE_REQUIRES_PICKER_ERROR,
  EVENT_START_IN_PAST_ERROR,
  getEventDateValidationError,
  getEventSetTimeInlineErrors,
  parseEventDate,
  resolveEventDateKey,
} from "@/lib/bookingDateTime";
import { getTextLengthValidationError } from "@/lib/textInputLimits";

export const MAX_EVENT_NAME_LENGTH = 30;
export const MAX_EVENT_VENUE_LENGTH = 30;

export type EventFormFieldErrors = {
  name?: string;
  venue?: string;
  eventDate?: string;
  startTime?: string;
  finishTime?: string;
};

export function getEventFormFieldErrors(input: {
  name: string;
  venue: string;
  eventDate: string;
  setTime: string;
}): EventFormFieldErrors {
  const errors: EventFormFieldErrors = {};

  if (!input.name.trim()) {
    errors.name = "Enter an event name";
  } else {
    const nameLengthError = getTextLengthValidationError(
      input.name,
      MAX_EVENT_NAME_LENGTH,
      "Event name",
    );

    if (nameLengthError) {
      errors.name = nameLengthError;
    }
  }

  if (!input.venue.trim()) {
    errors.venue = "Enter a venue";
  } else {
    const venueLengthError = getTextLengthValidationError(
      input.venue,
      MAX_EVENT_VENUE_LENGTH,
      "Venue",
    );

    if (venueLengthError) {
      errors.venue = venueLengthError;
    }
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

  const setTimeErrors = getEventSetTimeInlineErrors(input.setTime);

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
    } else if (scheduleError === EVENT_START_IN_PAST_ERROR) {
      errors.startTime = scheduleError;
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
