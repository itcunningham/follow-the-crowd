import type { EventCrewChatMessage } from "@/lib/eventCrewChat";
import { isGroupChatSystemUpdateMessage } from "@/lib/groupChatSystemMessages";

export function buildGroupChatSenderNameVisibility(
  messages: EventCrewChatMessage[],
  currentUserId: string | null,
): Map<string, boolean> {
  const visibility = new Map<string, boolean>();

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];

    if (currentUserId !== null && message.user_id === currentUserId) {
      continue;
    }

    if (isGroupChatSystemUpdateMessage(message.text)) {
      continue;
    }

    const previous = index > 0 ? messages[index - 1] : null;
    const showSenderName =
      !previous ||
      isGroupChatSystemUpdateMessage(previous.text) ||
      previous.user_id !== message.user_id;

    visibility.set(message.id, showSenderName);
  }

  return visibility;
}

export function resolveCrewChatMemberCount(
  participantCount: number | null,
  acceptedDjCount: number,
): number {
  if (participantCount !== null && participantCount > 0) {
    return participantCount;
  }

  return Math.max(acceptedDjCount + 1, 1);
}
