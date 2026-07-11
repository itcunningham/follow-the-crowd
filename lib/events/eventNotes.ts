import { applyTextInputLimit, getTextLengthValidationError } from "@/lib/textInputLimits";

export const MAX_EVENT_NOTES_LENGTH = 500;

export function applyEventNotesInputLimit(currentNotes: string, nextNotes: string): string | null {
  return applyTextInputLimit(currentNotes, nextNotes, MAX_EVENT_NOTES_LENGTH);
}

export function getEventNotesValidationError(notes: string): string | null {
  return getTextLengthValidationError(notes, MAX_EVENT_NOTES_LENGTH);
}
