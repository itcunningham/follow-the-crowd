import { applyTextInputLimit } from "@/lib/textInputLimits";

/** Counts explicit newline-separated rows (`value.split("\\n").length`). */
export function countExplicitLines(value: string): number {
  return value.split("\n").length;
}

function truncateToMaxExplicitLines(value: string, maxLines: number): string {
  return value.split("\n").slice(0, maxLines).join("\n");
}

/**
 * Limits multiline input by explicit newline count and character length.
 * Mirrors `applyEventNotesInputLimit` — allows deletions when over limit; truncates paste.
 */
export function applyCappedMultilineInputLimit(
  currentValue: string,
  nextValue: string,
  maxLines: number,
  maxLength: number,
): string | null {
  const currentLines = countExplicitLines(currentValue);
  const nextLines = countExplicitLines(nextValue);
  const currentOverLimit = currentLines > maxLines || currentValue.length > maxLength;

  let limitedNext = nextValue;

  if (nextLines > maxLines) {
    if (currentOverLimit && nextLines <= currentLines && nextValue.length <= currentValue.length) {
      limitedNext = nextValue;
    } else if (currentOverLimit) {
      return null;
    } else {
      limitedNext = truncateToMaxExplicitLines(nextValue, maxLines);
    }
  }

  return applyTextInputLimit(currentValue, limitedNext, maxLength);
}

export function shouldBlockMultilineEnter(value: string, maxLines: number): boolean {
  return countExplicitLines(value) >= maxLines;
}
