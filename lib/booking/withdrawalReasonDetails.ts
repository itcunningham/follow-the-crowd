export const MAX_WITHDRAWAL_OTHER_REASON_LENGTH = 120;
export const MAX_WITHDRAWAL_OTHER_REASON_LINES = 3;

export function countWithdrawalOtherReasonLines(value: string): number {
  return value.split("\n").length;
}

export function sanitizeWithdrawalOtherReasonValue(value: string): string {
  const lineLimited = value
    .split("\n")
    .slice(0, MAX_WITHDRAWAL_OTHER_REASON_LINES)
    .join("\n");

  if (lineLimited.length <= MAX_WITHDRAWAL_OTHER_REASON_LENGTH) {
    return lineLimited;
  }

  return lineLimited.slice(0, MAX_WITHDRAWAL_OTHER_REASON_LENGTH);
}

export function mapWithdrawalReasonCursorAfterSanitize(
  rawValue: string,
  sanitizedValue: string,
  cursor: number,
): number {
  if (rawValue === sanitizedValue) {
    return cursor;
  }

  return Math.min(Math.max(cursor, 0), sanitizedValue.length);
}

/** Submit/server boundary alias for the shared value sanitiser. */
export const sanitizeWithdrawalOtherReason = sanitizeWithdrawalOtherReasonValue;
