/**
 * One-shot marker recording that Event Details was opened by tapping View Event
 * inside a crew chat, so its Back control can POP that history entry instead of
 * pushing another copy of the conversation.
 *
 * Why a marker rather than trusting `?from=crew-chat` alone: the query
 * parameter survives a shared link, a cold load and a refresh, none of which
 * leave a crew chat entry behind Event Details. Calling `router.back()` in
 * those cases would leave the app entirely. The marker is written only by an
 * in-app tap, so it is a true statement about this tab's history.
 *
 * sessionStorage, not module scope, so it survives the full page load Event
 * Details performs; scoped to the event id so a marker from one conversation
 * can never authorise popping out of another.
 */
const STORAGE_KEY = "ftc-crew-chat-event-detail-origin";

export function markCrewChatEventDetailOrigin(eventId: string): void {
  if (typeof window === "undefined" || !eventId.trim()) {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, eventId.trim());
  } catch {
    // Private mode / storage disabled: the caller falls back to replace().
  }
}

/** True exactly once per mark, and only for the event that was marked. */
export function consumeCrewChatEventDetailOrigin(eventId: string): boolean {
  if (typeof window === "undefined" || !eventId.trim()) {
    return false;
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);

    if (stored !== eventId.trim()) {
      return false;
    }

    window.sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
