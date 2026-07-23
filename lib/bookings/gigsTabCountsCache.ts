import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import type { DjGigsListTab } from "@/lib/bookingRequests";

const GIGS_TAB_COUNTS_CACHE_KEY = "ftc-gigs-tab-counts-v1";

export type GigsTabCountsSnapshot = Record<DjGigsListTab, number>;

type GigsTabCountsCachePayload = {
  userId: string;
  counts: GigsTabCountsSnapshot;
  updatedAt: number;
};

let memoryCache: GigsTabCountsSnapshot | null = null;
let memoryUserId: string | null = null;

function isGigsTabCountsSnapshot(value: unknown): value is GigsTabCountsSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const counts = value as Partial<GigsTabCountsSnapshot>;

  return (
    typeof counts.pending === "number" &&
    Number.isFinite(counts.pending) &&
    counts.pending >= 0 &&
    typeof counts.accepted === "number" &&
    Number.isFinite(counts.accepted) &&
    counts.accepted >= 0 &&
    typeof counts.history === "number" &&
    Number.isFinite(counts.history) &&
    counts.history >= 0
  );
}

function parseGigsTabCountsCachePayload(raw: string): GigsTabCountsSnapshot | null {
  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GigsTabCountsCachePayload>;
    if (parsed.userId !== userId || !isGigsTabCountsSnapshot(parsed.counts)) {
      return null;
    }

    return {
      pending: Math.max(0, Math.floor(parsed.counts.pending)),
      accepted: Math.max(0, Math.floor(parsed.counts.accepted)),
      history: Math.max(0, Math.floor(parsed.counts.history)),
    };
  } catch (cacheError) {
    console.error("[gigs-tab-counts] Failed to parse tab counts cache:", cacheError);
    return null;
  }
}

/** Last confirmed Incoming/Confirmed/History tab counts for the current user (session-scoped). */
export function readGigsTabCountsCache(): GigsTabCountsSnapshot | null {
  const userId = readSupabaseSessionUserIdSync();
  if (!userId) {
    return null;
  }

  if (memoryUserId === userId && memoryCache) {
    return memoryCache;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(GIGS_TAB_COUNTS_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = parseGigsTabCountsCachePayload(raw);
    if (parsed) {
      memoryCache = parsed;
      memoryUserId = userId;
      return parsed;
    }
  } catch (cacheError) {
    console.error("[gigs-tab-counts] Failed to read session tab counts cache:", cacheError);
  }

  return null;
}

export function writeGigsTabCountsCache(counts: GigsTabCountsSnapshot): void {
  if (!isGigsTabCountsSnapshot(counts)) {
    return;
  }

  const userId = readSupabaseSessionUserIdSync();
  if (!userId || typeof window === "undefined") {
    return;
  }

  const normalized: GigsTabCountsSnapshot = {
    pending: Math.max(0, Math.floor(counts.pending)),
    accepted: Math.max(0, Math.floor(counts.accepted)),
    history: Math.max(0, Math.floor(counts.history)),
  };

  memoryCache = normalized;
  memoryUserId = userId;

  const payload: GigsTabCountsCachePayload = {
    userId,
    counts: normalized,
    updatedAt: Date.now(),
  };

  window.sessionStorage.setItem(GIGS_TAB_COUNTS_CACHE_KEY, JSON.stringify(payload));
}

export function clearGigsTabCountsCache(): void {
  memoryCache = null;
  memoryUserId = null;

  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(GIGS_TAB_COUNTS_CACHE_KEY);
}
