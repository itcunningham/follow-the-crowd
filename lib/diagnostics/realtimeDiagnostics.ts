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

export function rtLog(scope: string, event: string, detail?: unknown): void {
  if (!isRealtimeDiagnosticsEnabled()) {
    return;
  }

  if (detail === undefined) {
    console.log(`[ftc-rt ${stamp()}] ${scope} :: ${event}`);
    return;
  }

  console.log(`[ftc-rt ${stamp()}] ${scope} :: ${event}`, detail);
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
