export type ChatMessageGroupParticipant = {
  id: string;
  user_id: string;
};

export type ChatMessageGroupLayout = {
  /** Incoming rows only — bottom message in a same-sender cluster. */
  showAvatar: boolean;
  /** Reduce vertical gap to the visually older message above. */
  tightWithPrevious: boolean;
};

/** Avatar column width — matches ProfileAvatar sm (h-8 w-8) + gap-2. */
export const CHAT_INCOMING_AVATAR_SLOT_CLASS = "h-8 w-8 shrink-0";

/** Indent metadata (timestamp, report) to align with bubble column, not avatar. */
export const CHAT_INCOMING_METADATA_INDENT_CLASS = "pl-10";

/** Tighter stack gap for consecutive incoming bubbles (~2px net with gap-3 list). */
export const CHAT_INCOMING_GROUP_TIGHT_PREVIOUS_CLASS = "-mt-2.5";

/** Breathing room after a visible timestamp at cluster end. */
export const CHAT_INCOMING_GROUP_CLUSTER_END_CLASS = "mb-1.5";

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

/** Group consecutive chat bubbles from the same sender for spacing + avatar layout. */
export function buildChatMessageGroupLayout(
  messages: readonly ChatMessageGroupParticipant[],
): Map<string, ChatMessageGroupLayout> {
  const layoutByMessageId = new Map<string, ChatMessageGroupLayout>();

  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    const previous = findPreviousParticipant(messages, index);
    const next = findNextParticipant(messages, index);
    const sameSenderAsPrevious =
      previous !== null && previous.user_id === current.user_id;
    const sameSenderAsNext = next !== null && next.user_id === current.user_id;

    layoutByMessageId.set(current.id, {
      showAvatar: !sameSenderAsNext,
      tightWithPrevious: sameSenderAsPrevious,
    });
  }

  return layoutByMessageId;
}
