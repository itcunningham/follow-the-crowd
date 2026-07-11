export function applyTextInputLimit(
  current: string,
  next: string,
  maxLength: number,
): string | null {
  if (next.length <= maxLength) {
    return next;
  }

  if (current.length > maxLength && next.length <= current.length) {
    return next;
  }

  if (current.length <= maxLength) {
    return next.slice(0, maxLength);
  }

  return null;
}

export function getTextLengthValidationError(
  value: string,
  maxLength: number,
  label = "Notes",
): string | null {
  if (value.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer`;
  }

  return null;
}
