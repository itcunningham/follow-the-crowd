/**
 * TEMPORARY diagnostics for the booking-acceptance realtime investigation.
 *
 * Opt-in only, so this is safe to deploy: nothing logs unless the tester turns
 * it on. Enable on a device with either
 *   localStorage.setItem("ftc-debug-realtime", "1")   (persists across reloads)
 * or by loading any page with ?ftcdebug=realtime      (sets the flag for you)
 * and disable with localStorage.removeItem("ftc-debug-realtime").
 *
 * REMOVE THIS FILE once the root cause is confirmed.
 */

const FLAG_KEY = "ftc-debug-realtime";

let enabledCache: boolean | null = null;

export function isRealtimeDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (enabledCache !== null) {
    return enabledCache;
  }

  try {
    if (new URLSearchParams(window.location.search).get("ftcdebug") === "realtime") {
      window.localStorage.setItem(FLAG_KEY, "1");
    }

    enabledCache = window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    enabledCache = false;
  }

  return enabledCache;
}

function stamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/** Ring buffer so the on-screen panel can show/copy logs without a USB console. */
const MAX_ENTRIES = 200;
const subscribers = new Set<() => void>();

/**
 * Held as an immutable snapshot, replaced (never mutated) on every append.
 * `useSyncExternalStore` bails out when getSnapshot returns a reference-equal
 * value, so mutating one array in place would leave the panel permanently empty.
 */
let snapshot: readonly string[] = [];

export function subscribeRealtimeDiagnostics(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function getRealtimeDiagnosticsSnapshot(): readonly string[] {
  return snapshot;
}

export function clearRealtimeDiagnostics(): void {
  snapshot = [];
  subscribers.forEach((listener) => listener());
}

function record(line: string): void {
  const next = [...snapshot, line];
  snapshot = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
  subscribers.forEach((listener) => listener());
}

export function rtLog(scope: string, event: string, detail?: unknown): void {
  if (!isRealtimeDiagnosticsEnabled()) {
    return;
  }

  let line = `${stamp()} ${scope} :: ${event}`;

  if (detail !== undefined) {
    try {
      line += ` ${JSON.stringify(detail)}`;
    } catch {
      line += " [unserialisable]";
    }
  }

  record(line);
  console.log(`[ftc-rt] ${line}`);
}

/** Channel lifecycle: SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED. */
export function rtLogChannelStatus(
  channelName: string,
  status: string,
  error?: unknown,
): void {
  rtLog("channel", `${channelName} -> ${status}`, error ?? undefined);
}

/** Every booking_requests payload, reduced to the fields this bug turns on. */
export function rtLogBookingPayload(channelName: string, payload: unknown): void {
  if (!isRealtimeDiagnosticsEnabled()) {
    return;
  }

  const p = payload as {
    eventType?: string;
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
  };

  rtLog("payload", `${channelName} booking_requests`, {
    eventType: p?.eventType,
    id: p?.new?.id ?? p?.old?.id,
    sender_id: p?.new?.sender_id ?? p?.old?.sender_id,
    recipient_id: p?.new?.recipient_id ?? p?.old?.recipient_id,
    oldStatus: p?.old?.status,
    newStatus: p?.new?.status,
    oldKeys: p?.old ? Object.keys(p.old).length : 0,
  });
}
