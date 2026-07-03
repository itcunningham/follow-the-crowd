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
