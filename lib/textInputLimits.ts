/**
 * Counts Unicode code points, not UTF-16 code units. `string.length` counts
 * a surrogate-pair character (most emoji, e.g. "🎧".length === 2) as two --
 * so a character limit enforced with raw `.length` blocks typing well
 * before the user has actually typed that many characters as they'd count
 * them. This was the root cause of the Profile Bio field appearing to stop
 * accepting input partway to its limit: the visible counter and the cap
 * were both counting UTF-16 units, so a single emoji silently consumed 2+
 * of the budget's "slots". Counting code points instead matches what the
 * user perceives as one typed character for the overwhelming majority of
 * real input (plain text and simple emoji); it does not fully handle
 * multi-codepoint grapheme clusters (e.g. ZWJ family emoji), which is an
 * intentionally out-of-scope, far rarer edge case.
 */
export function countUnicodeCharacters(value: string): number {
  return Array.from(value).length;
}

function truncateUnicodeCharacters(value: string, maxCharacters: number): string {
  return Array.from(value).slice(0, maxCharacters).join("");
}

export function applyTextInputLimit(
  current: string,
  next: string,
  maxLength: number,
): string | null {
  const nextCount = countUnicodeCharacters(next);

  if (nextCount <= maxLength) {
    return next;
  }

  const currentCount = countUnicodeCharacters(current);

  if (currentCount > maxLength && nextCount <= currentCount) {
    return next;
  }

  if (currentCount <= maxLength) {
    return truncateUnicodeCharacters(next, maxLength);
  }

  return null;
}

export function getTextLengthValidationError(
  value: string,
  maxLength: number,
  label = "Notes",
): string | null {
  if (countUnicodeCharacters(value) > maxLength) {
    return `${label} must be ${maxLength} characters or fewer`;
  }

  return null;
}
