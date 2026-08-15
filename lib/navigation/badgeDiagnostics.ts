import { isInstalledPWA } from "@/lib/push/client";

/**
 * TEMPORARY — device-side evidence for the "Home Screen badge never
 * appears" investigation, in the exact shape requested for real-device
 * triage. Every field is a plain boolean/number/short safe error name —
 * never an endpoint, key, token, or full error message. Remove once the
 * investigation concludes.
 */
export type BadgeDiagnostics = {
  unreadTotal: number | null;
  badgingApiSupported: boolean;
  lastSetValue: number | "cleared" | null;
  /** "success", a DOMException/Error name (e.g. "NotAllowedError"), or null before any attempt. */
  lastResult: string | null;
  standalone: boolean;
};

function detectBadgingApiSupport(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const badgingNavigator = navigator as Navigator & {
    setAppBadge?: unknown;
    clearAppBadge?: unknown;
  };

  return (
    typeof badgingNavigator.setAppBadge === "function" &&
    typeof badgingNavigator.clearAppBadge === "function"
  );
}

let current: BadgeDiagnostics = {
  unreadTotal: null,
  badgingApiSupported: detectBadgingApiSupport(),
  lastSetValue: null,
  lastResult: null,
  standalone: isInstalledPWA(),
};

const listeners = new Set<() => void>();

export function recordBadgeSyncAttempt(update: Partial<BadgeDiagnostics>): void {
  current = { ...current, ...update, standalone: isInstalledPWA() };
  listeners.forEach((listener) => listener());
}

export function readBadgeDiagnostics(): BadgeDiagnostics {
  return current;
}

export function subscribeBadgeDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
