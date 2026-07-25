import { applyTextInputLimit } from "@/lib/textInputLimits";

export const MAX_WITHDRAWAL_OTHER_REASON_LENGTH = 120;
export const MAX_WITHDRAWAL_OTHER_REASON_LINES = 3;

export function countWithdrawalOtherReasonLines(value: string): number {
  return value.split("\n").length;
}

function truncateWithdrawalOtherReasonToMaxLines(value: string): string {
  return value.split("\n").slice(0, MAX_WITHDRAWAL_OTHER_REASON_LINES).join("\n");
}

export function sanitizeWithdrawalOtherReasonInput(
  currentValue: string,
  nextValue: string,
): string | null {
  const currentLines = countWithdrawalOtherReasonLines(currentValue);
  const nextLines = countWithdrawalOtherReasonLines(nextValue);
  const currentOverLimit =
    currentLines > MAX_WITHDRAWAL_OTHER_REASON_LINES ||
    currentValue.length > MAX_WITHDRAWAL_OTHER_REASON_LENGTH;

  let limitedNext = nextValue;

  if (nextLines > MAX_WITHDRAWAL_OTHER_REASON_LINES) {
    if (currentOverLimit && nextLines <= currentLines && nextValue.length <= currentValue.length) {
      limitedNext = nextValue;
    } else if (currentOverLimit) {
      return null;
    } else {
      limitedNext = truncateWithdrawalOtherReasonToMaxLines(nextValue);
    }
  }

  return applyTextInputLimit(currentValue, limitedNext, MAX_WITHDRAWAL_OTHER_REASON_LENGTH);
}

export function sanitizeWithdrawalOtherReason(value: string): string {
  const lineLimited = truncateWithdrawalOtherReasonToMaxLines(value);

  if (lineLimited.length <= MAX_WITHDRAWAL_OTHER_REASON_LENGTH) {
    return lineLimited;
  }

  return lineLimited.slice(0, MAX_WITHDRAWAL_OTHER_REASON_LENGTH);
}
