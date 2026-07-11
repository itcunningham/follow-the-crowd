import { applyTextInputLimit, getTextLengthValidationError } from "@/lib/textInputLimits";

export const MAX_EVENT_NOTES_LENGTH = 500;
export const MAX_EVENT_NOTES_LINES = 8;

export function countEventNotesLines(notes: string): number {
  return notes.split("\n").length;
}

function truncateToMaxLines(notes: string, maxLines: number): string {
  return notes.split("\n").slice(0, maxLines).join("\n");
}

export function applyEventNotesInputLimit(currentNotes: string, nextNotes: string): string | null {
  const currentLines = countEventNotesLines(currentNotes);
  const nextLines = countEventNotesLines(nextNotes);
  const currentOverLimit =
    currentLines > MAX_EVENT_NOTES_LINES || currentNotes.length > MAX_EVENT_NOTES_LENGTH;

  let limitedNext = nextNotes;

  if (nextLines > MAX_EVENT_NOTES_LINES) {
    if (currentOverLimit && nextLines <= currentLines && nextNotes.length <= currentNotes.length) {
      limitedNext = nextNotes;
    } else if (currentOverLimit) {
      return null;
    } else {
      limitedNext = truncateToMaxLines(nextNotes, MAX_EVENT_NOTES_LINES);
    }
  }

  return applyTextInputLimit(currentNotes, limitedNext, MAX_EVENT_NOTES_LENGTH);
}

export function getEventNotesLineValidationError(notes: string): string | null {
  if (countEventNotesLines(notes) > MAX_EVENT_NOTES_LINES) {
    return "Notes must be 8 lines or fewer";
  }

  return null;
}

export function getEventNotesValidationError(notes: string): string | null {
  return (
    getEventNotesLineValidationError(notes) ??
    getTextLengthValidationError(notes, MAX_EVENT_NOTES_LENGTH)
  );
}
