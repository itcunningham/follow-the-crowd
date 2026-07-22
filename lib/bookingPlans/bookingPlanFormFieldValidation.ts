import {
  MAX_BOOKING_PLAN_NAME_LENGTH,
  MAX_EVENT_NAME_LENGTH,
  MAX_EVENT_VENUE_LENGTH,
} from "@/lib/events/eventFormFieldValidation";
import { getTextLengthValidationError } from "@/lib/textInputLimits";

export type BookingPlanFormFieldErrors = {
  name?: string;
  eventName?: string;
  venue?: string;
};

function getPlanNameFieldError(name: string): string | undefined {
  if (!name.trim()) {
    return "Enter a plan name";
  }

  const lengthError = getTextLengthValidationError(
    name,
    MAX_BOOKING_PLAN_NAME_LENGTH,
    "Plan name",
  );

  return lengthError ?? undefined;
}

function getPlanEventNameFieldError(eventName: string): string | undefined {
  if (!eventName.trim()) {
    return "Enter an event name";
  }

  const lengthError = getTextLengthValidationError(
    eventName,
    MAX_EVENT_NAME_LENGTH,
    "Event name",
  );

  return lengthError ?? undefined;
}

function getPlanVenueFieldError(venue: string): string | undefined {
  if (!venue.trim()) {
    return "Enter a venue";
  }

  const lengthError = getTextLengthValidationError(
    venue,
    MAX_EVENT_VENUE_LENGTH,
    "Venue",
  );

  return lengthError ?? undefined;
}

export function getBookingPlanFormFieldErrors(input: {
  name: string;
  eventName: string;
  venue: string;
}): BookingPlanFormFieldErrors {
  const errors: BookingPlanFormFieldErrors = {};

  const nameError = getPlanNameFieldError(input.name);
  if (nameError) {
    errors.name = nameError;
  }

  const eventNameError = getPlanEventNameFieldError(input.eventName);
  if (eventNameError) {
    errors.eventName = eventNameError;
  }

  const venueError = getPlanVenueFieldError(input.venue);
  if (venueError) {
    errors.venue = venueError;
  }

  return errors;
}

export function hasBookingPlanFormFieldErrors(errors: BookingPlanFormFieldErrors): boolean {
  return Boolean(errors.name || errors.eventName || errors.venue);
}

export function assertBookingPlanFormTextFieldLimits(input: {
  name: string;
  eventName: string;
  venue: string;
}): void {
  const errors = getBookingPlanFormFieldErrors(input);
  const firstError = errors.name ?? errors.eventName ?? errors.venue;

  if (firstError) {
    throw new Error(firstError);
  }
}
