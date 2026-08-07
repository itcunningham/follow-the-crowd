export const GROUP_CHAT_BOOKING_UPDATE_PREFIX = "Booking update:";

/** Fixed notice when crew chat unlocks (manual Start or auto-start). */
export const CREW_CHAT_STARTED_NOTICE = "Crew chat started";

function isGroupChatCrewOpenedNotice(text: string): boolean {
  return /^.+ joined the event crew\. Crew chat is now open\.$/.test(text.trim());
}

function isGroupChatCrewStartedNotice(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed === CREW_CHAT_STARTED_NOTICE ||
    // Brief Claude ship used "{name} started the crew" — still recognize it.
    /^.+ started the crew$/.test(trimmed)
  );
}

export function isGroupChatSystemUpdateMessage(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith(GROUP_CHAT_BOOKING_UPDATE_PREFIX) ||
    isGroupChatCrewOpenedNotice(trimmed) ||
    isGroupChatCrewStartedNotice(trimmed)
  );
}

/**
 * Crew-roster notices that are no longer written and are hidden wherever they
 * still exist: someone joining, accepting, or leaving.
 *
 * The emitters are gone, but rows written before that are ordinary `messages`
 * rows and deleting them would be a data change. Hiding them at read time is
 * what makes an existing chat open on its first human message rather than on a
 * list of arrivals, and it costs nothing on a chat that never had them.
 *
 * Deliberately narrow: it matches only these three shapes, so the system-notice
 * lane stays available for the kind of update everyone genuinely needs — a run
 * sheet change, a new venue, a cancelled event.
 */
export function isHiddenCrewRosterNotice(text: string): boolean {
  const trimmed = text.trim();

  if (isGroupChatCrewOpenedNotice(trimmed)) {
    return true;
  }

  if (!trimmed.startsWith(GROUP_CHAT_BOOKING_UPDATE_PREFIX)) {
    return false;
  }

  const body = trimmed.slice(GROUP_CHAT_BOOKING_UPDATE_PREFIX.length).trim();

  return (
    /^.+ accepted and joined the event crew\.$/.test(body) ||
    /^.+ is no longer scheduled for this event\./.test(body)
  );
}

export function formatGroupChatSystemNoticeText(text: string): string {
  const trimmed = text.trim();

  if (trimmed === CREW_CHAT_STARTED_NOTICE) {
    return CREW_CHAT_STARTED_NOTICE;
  }

  const crewStartedMatch = trimmed.match(/^(.+?) started the crew$/);

  if (crewStartedMatch) {
    return CREW_CHAT_STARTED_NOTICE;
  }

  const crewOpenedMatch = trimmed.match(/^(.+?) joined the event crew\. Crew chat is now open\.$/);

  if (crewOpenedMatch) {
    const name = crewOpenedMatch[1]?.trim() || "Someone";
    return `${name} joined the crew`;
  }

  const body = trimmed.startsWith(GROUP_CHAT_BOOKING_UPDATE_PREFIX)
    ? trimmed.slice(GROUP_CHAT_BOOKING_UPDATE_PREFIX.length).trim()
    : trimmed;

  const acceptedMatch = body.match(/^(.+?) accepted and joined the event crew\.$/);

  if (acceptedMatch) {
    const name = acceptedMatch[1]?.trim() || "Someone";
    return `${name} joined the crew`;
  }

  const withdrawnMatch = body.match(
    /^(.+?) is no longer scheduled for this event\.\s*(?:Reason:\s*(.+))?$/,
  );

  if (withdrawnMatch) {
    const name = withdrawnMatch[1]?.trim() || "Crew member";
    const reason = withdrawnMatch[2]?.trim();

    return reason ? `${name} withdrew · ${reason}` : `${name} withdrew`;
  }

  return body.replace(/\s+/g, " ");
}

export function formatGroupChatInboxPreview(
  messageText: string | null | undefined,
  options?: { prefixYou?: boolean },
): string | null {
  const trimmed = messageText?.trim();

  if (!trimmed) {
    return null;
  }

  const preview = isGroupChatSystemUpdateMessage(trimmed)
    ? formatGroupChatSystemNoticeText(trimmed)
    : trimmed;

  return options?.prefixYou ? `You: ${preview}` : preview;
}
