export type ChatMessageGroupParticipant = {
  id: string;
  user_id: string;
  /** When false, breaks same-sender grouping (attachments, booking cards). */
  groupable?: boolean;
};

export type ChatMessageGroupPosition = "standalone" | "first" | "middle" | "last";

export type ChatMessageGroupLayout = {
  position: ChatMessageGroupPosition;
  /** Incoming cluster end — show avatar + timestamp footer. */
  showAvatar: boolean;
  /** Pull toward the visually older message above (flex-col-reverse safe). */
  tightWithPrevious: boolean;
};

/** Avatar column width — matches ProfileAvatar sm (h-8 w-8). */
export const CHAT_INCOMING_AVATAR_SLOT_CLASS = "h-8 w-8 shrink-0";

/**
 * Tighten stacked incoming bubbles. Uses negative bottom margin because the message
 * list is `flex-col-reverse` (newer DOM nodes sit visually below older ones).
 */
export const CHAT_INCOMING_GROUP_TIGHT_PREVIOUS_CLASS = "-mb-3";

/** Breathing room after a cluster footer before the next sender. */
export const CHAT_INCOMING_GROUP_CLUSTER_END_CLASS = "mb-1.5";

/** Avatar + timestamp row anchored beneath the final bubble in a group. */
export const CHAT_INCOMING_GROUP_FOOTER_CLASS = "mt-0 flex items-center gap-1.5";

/** Outgoing consecutive same-sender stack (unchanged feel). */
export const CHAT_OUTGOING_GROUP_TIGHT_PREVIOUS_CLASS = "-mt-2.5";

function findPreviousParticipant(
  messages: readonly ChatMessageGroupParticipant[],
  index: number,
): ChatMessageGroupParticipant | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    return messages[cursor];
  }

  return null;
}

function findNextParticipant(
  messages: readonly ChatMessageGroupParticipant[],
  index: number,
): ChatMessageGroupParticipant | null {
  for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
    return messages[cursor];
  }

  return null;
}

function isGroupableParticipant(participant: ChatMessageGroupParticipant): boolean {
  return participant.groupable !== false;
}

function isSameSenderGroup(
  earlier: ChatMessageGroupParticipant | null,
  later: ChatMessageGroupParticipant | null,
): boolean {
  if (!earlier || !later) {
    return false;
  }

  if (earlier.user_id !== later.user_id) {
    return false;
  }

  return isGroupableParticipant(earlier) && isGroupableParticipant(later);
}

function resolveGroupPosition(
  sameSenderAsPrevious: boolean,
  sameSenderAsNext: boolean,
): ChatMessageGroupPosition {
  if (!sameSenderAsPrevious && !sameSenderAsNext) {
    return "standalone";
  }

  if (!sameSenderAsPrevious && sameSenderAsNext) {
    return "first";
  }

  if (sameSenderAsPrevious && sameSenderAsNext) {
    return "middle";
  }

  return "last";
}

/** Group consecutive text bubbles from the same sender for spacing + avatar layout. */
export function buildChatMessageGroupLayout(
  messages: readonly ChatMessageGroupParticipant[],
): Map<string, ChatMessageGroupLayout> {
  const layoutByMessageId = new Map<string, ChatMessageGroupLayout>();

  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    const previous = findPreviousParticipant(messages, index);
    const next = findNextParticipant(messages, index);
    const sameSenderAsPrevious = isSameSenderGroup(previous, current);
    const sameSenderAsNext = isSameSenderGroup(current, next);
    const position = resolveGroupPosition(sameSenderAsPrevious, sameSenderAsNext);

    layoutByMessageId.set(current.id, {
      position,
      showAvatar: position === "last" || position === "standalone",
      tightWithPrevious: sameSenderAsPrevious,
    });
  }

  return layoutByMessageId;
}

export function resolveIncomingGroupLiClass({
  tightWithPrevious,
  isClusterEnd,
  showTimestamp,
}: {
  tightWithPrevious: boolean;
  isClusterEnd: boolean;
  showTimestamp: boolean;
}): string {
  return [
    "group/message flex justify-start",
    tightWithPrevious ? CHAT_INCOMING_GROUP_TIGHT_PREVIOUS_CLASS : "",
    isClusterEnd && showTimestamp ? CHAT_INCOMING_GROUP_CLUSTER_END_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");
}
