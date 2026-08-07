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

/** Instagram-style join line shown to other DJs (not the planner). */
export function isCrewMemberJoinedNotice(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? "";

  if (!trimmed || isGroupChatCrewOpenedNotice(trimmed)) {
    return false;
  }

  return /^.+ joined the crew$/.test(trimmed);
}

export function formatCrewMemberJoinedNotice(displayName: string): string {
  const name = displayName.trim() || "Someone";
  return `${name} joined the crew`;
}

export function isGroupChatSystemUpdateMessage(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith(GROUP_CHAT_BOOKING_UPDATE_PREFIX) ||
    isGroupChatCrewOpenedNotice(trimmed) ||
    isGroupChatCrewStartedNotice(trimmed) ||
    isCrewMemberJoinedNotice(trimmed)
  );
}

/**
 * Notices that stay in `messages` (unread / inbox preview) but are hidden in
 * the open crew-chat thread for everyone:
 * - legacy roster lines (join / accept / leave) — emitters are gone
 * - "Crew chat started" — needed so Crew Chats can show unread; pill is redundant in-thread
 *
 * New "{name} joined the crew" lines are NOT here — DJs see them; planner hides via
 * `shouldOmitCrewMessageForViewer`.
 */
export function isHiddenCrewRosterNotice(text: string): boolean {
  const trimmed = text.trim();

  if (isGroupChatCrewOpenedNotice(trimmed) || isGroupChatCrewStartedNotice(trimmed)) {
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

/**
 * Thread visibility: global hides + planner-only hide for join pills
 * (planner already knows from the booking accept).
 */
export function shouldOmitCrewMessageForViewer(
  text: string,
  options?: { viewerUserId?: string | null; ownerId?: string | null },
): boolean {
  if (isHiddenCrewRosterNotice(text)) {
    return true;
  }

  const viewerUserId = options?.viewerUserId?.trim();
  const ownerId = options?.ownerId?.trim();

  if (
    viewerUserId &&
    ownerId &&
    viewerUserId === ownerId &&
    isCrewMemberJoinedNotice(text)
  ) {
    return true;
  }

  return false;
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

  if (isCrewMemberJoinedNotice(trimmed)) {
    return trimmed;
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
