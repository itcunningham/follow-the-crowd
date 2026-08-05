/**
 * One-shot markers for Event Details ↔ Crew Chat history pops.
 *
 * sessionStorage, not module scope, so markers survive full page loads;
 * scoped to the event id so a marker from one conversation can never
 * authorise popping out of another.
 */

/** Event Details opened via Crew Chat "View Event" — Back should pop. */
const VIEW_EVENT_FROM_CREW_CHAT_KEY = "ftc-crew-chat-event-detail-origin";

/**
 * Crew Chat opened via Event Details "Group chat" — Back should pop to the
 * exact Event Details URL (calendar / history / DM origin query intact).
 * A bare `/events/:id` fallback was dropping `from=calendar` and sending the
 * next Back to Events Active.
 */
const CREW_CHAT_FROM_EVENT_DETAIL_KEY = "ftc-event-detail-crew-chat-open";

/**
 * Query key carrying Event Details' search string on the crew-chat URL when
 * the one-shot pop marker is missing (refresh / shared link). Must not reuse
 * `from` — that already means "opened from Messages" on crew chat.
 * Same key is reused on Event Details → Open DM so Back restores Gigs/Calendar
 * origin query (a bare `/events/:id` drop sent the next Back to Incoming).
 */
export const CREW_CHAT_EVENT_DETAIL_RETURN_PARAM = "eventReturn";

/**
 * Rebuild `/events/:id` with the Event Details query that opened a nested
 * screen (crew chat / DM). Only query-string material is accepted — never a
 * path or absolute URL.
 */
export function buildEventDetailHrefFromReturnQuery(
  eventId: string,
  eventDetailReturn: string | null | undefined,
): string {
  const base = `/events/${eventId}`;
  const trimmed = eventDetailReturn?.trim();

  if (!trimmed) {
    return base;
  }

  try {
    const params = new URLSearchParams(trimmed);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  } catch {
    return base;
  }
}

function writeEventScopedMarker(storageKey: string, eventId: string): void {
  if (typeof window === "undefined" || !eventId.trim()) {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, eventId.trim());
  } catch {
    // Private mode / storage disabled: callers fall back to href navigation.
  }
}

function consumeEventScopedMarker(storageKey: string, eventId: string): boolean {
  if (typeof window === "undefined" || !eventId.trim()) {
    return false;
  }

  try {
    const stored = window.sessionStorage.getItem(storageKey);

    if (stored !== eventId.trim()) {
      return false;
    }

    window.sessionStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

export function markCrewChatEventDetailOrigin(eventId: string): void {
  writeEventScopedMarker(VIEW_EVENT_FROM_CREW_CHAT_KEY, eventId);
}

/** True exactly once per mark, and only for the event that was marked. */
export function consumeCrewChatEventDetailOrigin(eventId: string): boolean {
  return consumeEventScopedMarker(VIEW_EVENT_FROM_CREW_CHAT_KEY, eventId);
}

export function markCrewChatOpenedFromEventDetail(eventId: string): void {
  writeEventScopedMarker(CREW_CHAT_FROM_EVENT_DETAIL_KEY, eventId);
}

export function consumeCrewChatOpenedFromEventDetail(eventId: string): boolean {
  return consumeEventScopedMarker(CREW_CHAT_FROM_EVENT_DETAIL_KEY, eventId);
}
