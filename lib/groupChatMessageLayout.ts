import { DM_CHAT_MEANINGFUL_TIME_GAP_MS } from "@/lib/dm/dmChatTimestampVisibility";
import type { ChatMessageGroupPosition } from "@/lib/dm/chatMessageGroupLayout";
import { parseEventGroupChatUpdateMessage } from "@/lib/events/eventGroupChatUpdateMessage";
import { isGroupChatSystemUpdateMessage } from "@/lib/groupChatSystemMessages";

/** Minimum shape the grouping calculation needs from a crew chat row. */
export type CrewChatGroupingMessage = {
  id: string;
  user_id: string;
  created_at: string;
  text: string;
};

export type CrewChatMessageGroup = {
  /** First message of an uninterrupted run from one sender. */
  startsSenderGroup: boolean;
  /** Last message of that run. */
  endsSenderGroup: boolean;
  /** Sender name renders above this message (incoming, group start only). */
  showSenderName: boolean;
  /** Avatar renders beside this message (incoming, group end only). */
  showAvatar: boolean;
  /** Drives the spacing token: tight inside a run, looser at its edges. */
  position: ChatMessageGroupPosition;
  /** True when the previous message is part of the same run. */
  tightWithPrevious: boolean;
};

/**
 * App-authored rows — system notices and Event Updated cards. They are never
 * attributed to a person, so they carry no name or avatar and they always
 * break a run: two of Isaac's messages either side of an event update are two
 * separate groups, not one.
 */
function isRichCrewChatMessage(text: string): boolean {
  return isGroupChatSystemUpdateMessage(text) || parseEventGroupChatUpdateMessage(text) !== null;
}

function toTimestampMs(createdAt: string): number {
  const ms = new Date(createdAt).getTime();

  return Number.isNaN(ms) ? 0 : ms;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The single place a run of messages is allowed to break. Every visible
 * consequence — name, avatar, spacing — is derived from this one predicate,
 * so the three can never disagree.
 *
 * This replaced two independent calculations that did disagree in practice:
 * one filtered system rows out entirely (so messages either side of an event
 * update grouped together, dropping the avatar) while the other broke on them;
 * and only one of the two knew about time gaps (so after a centred timestamp
 * separator the avatar broke but the sender name did not reappear).
 */
function breaksSenderGroup(
  earlier: CrewChatGroupingMessage | undefined,
  later: CrewChatGroupingMessage | undefined,
): boolean {
  if (!earlier || !later) {
    return true;
  }

  // An app-authored row on either side always ends the run.
  if (isRichCrewChatMessage(earlier.text) || isRichCrewChatMessage(later.text)) {
    return true;
  }

  if (earlier.user_id !== later.user_id) {
    return true;
  }

  const earlierMs = toTimestampMs(earlier.created_at);
  const laterMs = toTimestampMs(later.created_at);

  if (earlierMs === 0 || laterMs === 0) {
    return false;
  }

  // A new calendar day renders a day separator, and a gap past the shared
  // threshold renders a centred timestamp — both are visible breaks, so the
  // run must break with them. Same constant the separators use, so the
  // grouping and the separators can never drift apart.
  if (!isSameCalendarDay(new Date(earlierMs), new Date(laterMs))) {
    return true;
  }

  return laterMs - earlierMs >= DM_CHAT_MEANINGFUL_TIME_GAP_MS;
}

function resolvePosition(starts: boolean, ends: boolean): ChatMessageGroupPosition {
  if (starts && ends) {
    return "standalone";
  }

  if (starts) {
    return "first";
  }

  return ends ? "last" : "middle";
}

/**
 * One grouping calculation for crew chat: name, avatar, spacing and break
 * rules all derived from the same run boundaries.
 *
 * Outgoing messages follow the identical rhythm but never show the current
 * user's own name or avatar, matching how DM and Instagram-style group chats
 * present your own side of the conversation.
 */
export function buildCrewChatMessageGroups(
  messages: readonly CrewChatGroupingMessage[],
  currentUserId: string | null,
): Map<string, CrewChatMessageGroup> {
  const groups = new Map<string, CrewChatMessageGroup>();

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const startsSenderGroup = breaksSenderGroup(messages[index - 1], message);
    const endsSenderGroup = breaksSenderGroup(message, messages[index + 1]);
    const isOwnMessage = currentUserId !== null && message.user_id === currentUserId;
    const isRich = isRichCrewChatMessage(message.text);
    const attributable = !isOwnMessage && !isRich;

    groups.set(message.id, {
      startsSenderGroup,
      endsSenderGroup,
      showSenderName: attributable && startsSenderGroup,
      showAvatar: attributable && endsSenderGroup,
      position: resolvePosition(startsSenderGroup, endsSenderGroup),
      tightWithPrevious: !startsSenderGroup,
    });
  }

  return groups;
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
