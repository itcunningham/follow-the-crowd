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
