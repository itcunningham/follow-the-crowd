/**
 * TEMPORARY — opt-in instrumentation for the Crew Chat unread investigation.
 *
 * DELETE THIS FILE, its call sites, and add `unreadTrace` to the banned list in
 * `testTemporaryDebugInstrumentationIsFullyRemoved` once the root cause is
 * proven. It is inert without its flag, which is exactly why the previous two
 * investigations nearly left their diagnostics behind.
 *
 * Enable:  add `?ftcunread=1` to any URL once (persists for the tab)
 * Disable: `?ftcunread=0`
 * Collect: `copy(JSON.stringify(window.__ftcUnreadTrace, null, 2))` in DevTools
 *
 * Why it exists: the unread highlight never appears live but appears after a
 * reload, while the preview updates live from the same realtime event. That
 * points at a value mismatch somewhere between `messages.event_id` and
 * `events.id`, but the two forms could not be compared without the running app.
 * Every id is recorded as raw text, JSON (so whitespace and case are visible)
 * and length, because the whole question is whether two strings that look
 * identical in a log actually are.
 */

const STORAGE_KEY = "ftc-unread-trace";
const MAX_ENTRIES = 500;

let cachedEnabled: boolean | null = null;
const lastLoggedByKey = new Map<string, string>();

type TraceWindow = Window & { __ftcUnreadTrace?: Record<string, unknown>[] };

function isEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (cachedEnabled !== null) {
    return cachedEnabled;
  }

  try {
    const flag = new URLSearchParams(window.location.search).get("ftcunread");

    if (flag === "1") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } else if (flag === "0") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }

    cachedEnabled = window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    cachedEnabled = false;
  }

  return cachedEnabled;
}

/**
 * Records an id in three forms. Two ids that print identically can still differ
 * by case or a trailing space, and that difference is the entire hypothesis
 * under test, so never log the bare string on its own.
 */
export function traceId(label: string, value: unknown): Record<string, unknown> {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);

  return {
    [label]: raw,
    [`${label}__json`]: JSON.stringify(raw),
    [`${label}__length`]: raw.length,
  };
}

export function unreadTrace(step: string, detail: Record<string, unknown>): void {
  if (!isEnabled()) {
    return;
  }

  const entry = { step, at: new Date().toISOString(), ...detail };
  const traceWindow = window as TraceWindow;
  const entries = traceWindow.__ftcUnreadTrace ?? [];

  entries.push(entry);

  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  traceWindow.__ftcUnreadTrace = entries;
  console.log("[unread-trace]", step, entry);
}

/**
 * Render paths run on every keystroke and every unrelated state change, so log
 * only when the recorded values actually change — otherwise the one transition
 * being investigated is buried in hundreds of identical lines.
 */
export function unreadTraceOnChange(
  step: string,
  dedupeKey: string,
  detail: Record<string, unknown>,
): void {
  if (!isEnabled()) {
    return;
  }

  const serialized = JSON.stringify(detail);

  if (lastLoggedByKey.get(dedupeKey) === serialized) {
    return;
  }

  lastLoggedByKey.set(dedupeKey, serialized);
  unreadTrace(step, detail);
}
