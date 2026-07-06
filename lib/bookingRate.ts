export const MAX_RATE_DIGITS = 10;

export function sanitizeRateDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MAX_RATE_DIGITS);
}

export function normalizeStoredRate(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "";
  }

  return sanitizeRateDigits(value);
}

export function formatRateDisplay(value: string | null | undefined): string {
  const digits = normalizeStoredRate(value);

  if (!digits) {
    return "$";
  }

  return `$${digits}`;
}

export function isPositiveWholeDollarRate(value: string | null | undefined): boolean {
  const digits = normalizeStoredRate(value);

  if (!digits) {
    return false;
  }

  const amount = Number.parseInt(digits, 10);

  return Number.isFinite(amount) && amount > 0;
}

export function rateDigitsToInteger(value: string): number {
  return Number.parseInt(normalizeStoredRate(value), 10);
}

export function integerRateToStored(value: number): string {
  return String(value);
}

export function formatIntegerRateDisplay(value: number | null | undefined): string {
  if (value == null || value <= 0) {
    return "$";
  }

  return `$${value}`;
}
