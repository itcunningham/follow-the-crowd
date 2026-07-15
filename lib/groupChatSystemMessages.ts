export const GROUP_CHAT_BOOKING_UPDATE_PREFIX = "Booking update:";

function isGroupChatCrewOpenedNotice(text: string): boolean {
  return /^.+ joined the event crew\. Crew chat is now open\.$/.test(text.trim());
}

export function isGroupChatSystemUpdateMessage(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith(GROUP_CHAT_BOOKING_UPDATE_PREFIX) || isGroupChatCrewOpenedNotice(trimmed)
  );
}

export function formatGroupChatSystemNoticeText(text: string): string {
  const trimmed = text.trim();

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
