import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";

export const PROPOSE_RATE_HELPER_MAX_OPENS = 3;

export const PROPOSE_RATE_HELPER_DESCRIPTION =
  "Send your fee for this booking. The planner can accept it or keep their original offer";

const PROPOSE_RATE_HELPER_OPENS_KEY_PREFIX = "ftc-propose-rate-helper-opens-v1";

function getStorageKey(userId: string): string {
  return `${PROPOSE_RATE_HELPER_OPENS_KEY_PREFIX}:${userId}`;
}

export function readProposeRateHelperOpenCount(userId: string | null): number {
  if (typeof window === "undefined" || !userId) {
    return 0;
  }

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Returns whether the helper should show for this open and records the view when it does. */
export function resolveProposeRateHelperVisibility(userId: string | null = readSupabaseSessionUserIdSync()): boolean {
  if (!userId) {
    return true;
  }

  const openCount = readProposeRateHelperOpenCount(userId);
  if (openCount >= PROPOSE_RATE_HELPER_MAX_OPENS) {
    return false;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(getStorageKey(userId), String(openCount + 1));
  }

  return true;
}
