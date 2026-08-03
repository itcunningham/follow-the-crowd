import {
  dmInboxReactionActivityToRowFields,
  parseDmReactionInboxPreview,
  type DmInboxReactionActivity,
} from "@/lib/dm/dmReactionInbox";
import { pickDmInboxPreviewMessage } from "@/lib/dm/messagePreview";
import type { BookingRequest } from "@/lib/bookingRequests";

export type InboxMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

export type DmInboxRow = {
  conversationId: string;
  name?: string;
  conversationCreatedAt?: string;
  latestActivityAt: string | null;
  latestPreview: string | null;
  latestMessageUserId: string | null;
};

export function normalizeInboxId(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * The unread Sets hold NORMALISED ids, and these two are the only way in and
 * out of them.
 *
 * The inbox learns the same thread's id from two different columns:
 * `events.id` / `conversations.id` when a row is loaded, and
 * `messages.event_id` / `messages.conversation_id` when a realtime message
 * arrives (`messages.event_id` is text rather than uuid in some environments —
 * see setupEventCrewChat.sql's conditional migration). Everything that compares
 * those two already normalises both sides: `applyInboxGroupMessage` matches a
 * row that way, and `removeUnreadEventChatId` deletes that way.
 *
 * Unread membership did not. A realtime message added the id exactly as the
 * message row carried it, while the row rendered
 * `unreadEventChatIds.has(chat.eventId)` — an exact-match lookup against the
 * events-table form. Any difference between the two, in case or surrounding
 * whitespace, and the add silently missed: the preview updated (normalised
 * comparison) while the highlight never appeared (exact one). A reload hid it,
 * because a reload rebuilds the Set from the events-table form the lookup uses.
 *
 * Normalising on the way in keeps `.size` honest for the Groups tab count — two
 * spellings of one thread must never count twice — and normalising the query
 * makes the lookup independent of which column the id came from.
 */
export function toNormalizedInboxIdSet(ids: Iterable<string>): Set<string> {
  const normalized = new Set<string>();

  for (const id of ids) {
    const key = normalizeInboxId(id);

    if (key) {
      normalized.add(key);
    }
  }

  return normalized;
}

export function hasUnreadInboxId(
  unreadIds: ReadonlySet<string>,
  id: string | null | undefined,
): boolean {
  const key = normalizeInboxId(id);

  return key ? unreadIds.has(key) : false;
}

export function getInboxActivityTimestamp(
  latestActivityAt: string | null | undefined,
  fallbackDate: string | null | undefined,
): number {
  if (latestActivityAt) {
    const timestamp = new Date(latestActivityAt).getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  if (fallbackDate) {
    const timestamp = new Date(fallbackDate).getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

export function sortDmInboxRows(rows: DmInboxRow[]): DmInboxRow[] {
  return [...rows].sort((left, right) => {
    const leftTime = getInboxActivityTimestamp(
      left.latestActivityAt,
      left.conversationCreatedAt,
    );
    const rightTime = getInboxActivityTimestamp(
      right.latestActivityAt,
      right.conversationCreatedAt,
    );

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.conversationId.localeCompare(right.conversationId);
  });
}

export function buildDmInboxRows(
  conversations: Array<{
    id?: string;
    conversation_id?: string;
    name?: string;
    created_at?: string;
  }>,
  messages: InboxMessage[],
  options?: {
    bookingsByConversationId?: Map<string, BookingRequest[]>;
  },
): DmInboxRow[] {
  const latestByConversation = new Map<string, InboxMessage>();

  for (const conversation of conversations) {
    const conversationId = conversation.id || conversation.conversation_id;

    if (!conversationId) {
      continue;
    }

    const bookings = options?.bookingsByConversationId?.get(conversationId) ?? [];
    const previewMessage = pickDmInboxPreviewMessage(messages, conversationId, bookings);

    if (previewMessage) {
      latestByConversation.set(conversationId, previewMessage);
    }
  }

  const rows: DmInboxRow[] = [];

  for (const conversation of conversations) {
    const conversationId = conversation.id || conversation.conversation_id;

    if (!conversationId) {
      continue;
    }

    const latestMessage = latestByConversation.get(conversationId);

    rows.push({
      conversationId,
      name: conversation.name,
      conversationCreatedAt: conversation.created_at,
      latestActivityAt: latestMessage?.created_at ?? null,
      latestPreview: latestMessage?.text ?? null,
      latestMessageUserId: latestMessage?.user_id ?? null,
    });
  }

  return sortDmInboxRows(rows);
}

export function applyDmInboxRealtimeMessage(
  rows: DmInboxRow[],
  newMessage: InboxMessage,
  options?: {
    allMessages?: InboxMessage[];
    bookingsByConversationId?: Map<string, BookingRequest[]>;
  },
): { rows: DmInboxRow[]; matched: boolean } {
  const targetId = normalizeInboxId(newMessage.conversation_id);
  let matched = false;
  const bookings =
    options?.bookingsByConversationId?.get(newMessage.conversation_id) ?? [];
  const previewMessage =
    options?.allMessages && options.bookingsByConversationId
      ? pickDmInboxPreviewMessage(
          options.allMessages,
          newMessage.conversation_id,
          bookings,
        )
      : newMessage;

  const updated = rows.map((row) => {
    if (normalizeInboxId(row.conversationId) !== targetId) {
      return row;
    }

    matched = true;

    return {
      ...row,
      latestActivityAt: previewMessage?.created_at ?? newMessage.created_at,
      latestPreview: previewMessage?.text ?? newMessage.text,
      latestMessageUserId: previewMessage?.user_id ?? newMessage.user_id,
    };
  });

  if (!matched) {
    return { rows, matched: false };
  }

  const beforeIds = rows.map((row) => row.conversationId);
  const sorted = sortDmInboxRows(updated);
  const afterIds = sorted.map((row) => row.conversationId);

  console.log("[Inbox sort] DM before", beforeIds);
  console.log("[Inbox sort] DM after", afterIds, {
    chatId: newMessage.conversation_id,
    messageId: newMessage.id,
    created_at: newMessage.created_at,
  });

  return { rows: sorted, matched: true };
}

function getInboxActivityTimestampValue(
  latestActivityAt: string | null | undefined,
): number {
  if (!latestActivityAt) {
    return 0;
  }

  const timestamp = new Date(latestActivityAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function mergeDmInboxReactionActivities(
  rows: DmInboxRow[],
  activities: Map<string, DmInboxReactionActivity>,
): DmInboxRow[] {
  if (activities.size === 0) {
    return rows;
  }

  const updated = rows.map((row) => {
    const activity = activities.get(row.conversationId);

    if (!activity) {
      return row;
    }

    const reactionTimestamp = getInboxActivityTimestampValue(activity.activityAt);
    const rowTimestamp = getInboxActivityTimestampValue(row.latestActivityAt);

    if (reactionTimestamp < rowTimestamp) {
      return row;
    }

    return {
      ...row,
      ...dmInboxReactionActivityToRowFields(activity),
    };
  });

  return sortDmInboxRows(updated);
}

export function applyDmInboxRealtimeReaction(
  rows: DmInboxRow[],
  activity: DmInboxReactionActivity,
): { rows: DmInboxRow[]; matched: boolean; updated: boolean } {
  const targetId = normalizeInboxId(activity.conversationId);
  let matched = false;
  let updated = false;

  const nextRows = rows.map((row) => {
    if (normalizeInboxId(row.conversationId) !== targetId) {
      return row;
    }

    matched = true;

    const existingReactionPreview = parseDmReactionInboxPreview(row.latestPreview);
    const reactionTimestamp = getInboxActivityTimestampValue(activity.activityAt);
    const rowTimestamp = getInboxActivityTimestampValue(row.latestActivityAt);
    const isSameReaction = existingReactionPreview?.reactionId === activity.reactionId;

    if (
      isSameReaction &&
      existingReactionPreview?.emoji === activity.emoji &&
      reactionTimestamp === rowTimestamp
    ) {
      return row;
    }

    if (isSameReaction) {
      updated = true;

      return {
        ...row,
        ...dmInboxReactionActivityToRowFields(activity),
      };
    }

    if (reactionTimestamp < rowTimestamp) {
      return row;
    }

    updated = true;

    return {
      ...row,
      ...dmInboxReactionActivityToRowFields(activity),
    };
  });

  if (!matched || !updated) {
    return { rows, matched, updated: false };
  }

  return {
    rows: sortDmInboxRows(nextRows),
    matched: true,
    updated: true,
  };
}

export function applyDmInboxRealtimeReactionRemoval(
  rows: DmInboxRow[],
  options: {
    conversationId: string;
    reactionId: string;
    fallback: Pick<
      DmInboxRow,
      "latestActivityAt" | "latestPreview" | "latestMessageUserId"
    >;
  },
): { rows: DmInboxRow[]; removed: boolean } {
  const targetId = normalizeInboxId(options.conversationId);
  let removed = false;

  const nextRows = rows.map((row) => {
    if (normalizeInboxId(row.conversationId) !== targetId) {
      return row;
    }

    const currentReactionPreview = parseDmReactionInboxPreview(row.latestPreview);

    if (currentReactionPreview?.reactionId !== options.reactionId) {
      return row;
    }

    removed = true;

    return {
      ...row,
      ...options.fallback,
    };
  });

  if (!removed) {
    return { rows, removed: false };
  }

  return {
    rows: sortDmInboxRows(nextRows),
    removed: true,
  };
}

export function logInboxRenderOrder(
  section: "DM" | "group",
  items: Array<{ id: string; latestActivityAt: string | null }>,
) {
  console.log(
    `[Inbox render] ${section} rendered order`,
    items.map((item) => ({
      id: item.id,
      latestActivityAt: item.latestActivityAt,
    })),
  );
}

export function detectInboxRealtimeMessageType(message: {
  conversation_id?: string | null;
  event_id?: string | null;
}) {
  const conversationId = message.conversation_id?.trim() ?? "";
  const eventId = message.event_id ? String(message.event_id).trim() : "";

  if (eventId && !conversationId) {
    return "group" as const;
  }

  if (conversationId) {
    return "dm" as const;
  }

  return "unknown" as const;
}
