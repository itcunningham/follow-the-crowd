import type { DmMessageReaction } from "@/lib/dmReactions";
import { supabase } from "@/lib/supabaseClient";

export const DM_REACTION_INBOX_PREVIEW_PREFIX = "__ftc_dm_reaction__:";

export type DmInboxReactionActivity = {
  conversationId: string;
  reactionId: string;
  emoji: string;
  reactorUserId: string;
  activityAt: string;
  messageAuthorUserId: string;
};

export function encodeDmReactionInboxPreview(
  reactionId: string,
  emoji: string,
  reactorUserId: string,
): string {
  return `${DM_REACTION_INBOX_PREVIEW_PREFIX}${reactionId}|${emoji}|${reactorUserId}`;
}

export function parseDmReactionInboxPreview(
  text: string | null | undefined,
): { reactionId: string; emoji: string; reactorUserId: string } | null {
  const trimmed = text?.trim();

  if (!trimmed?.startsWith(DM_REACTION_INBOX_PREVIEW_PREFIX)) {
    return null;
  }

  const payload = trimmed.slice(DM_REACTION_INBOX_PREVIEW_PREFIX.length);
  const [reactionId, emoji, reactorUserId] = payload.split("|");

  if (!reactionId || !emoji || !reactorUserId) {
    return null;
  }

  return { reactionId, emoji, reactorUserId };
}

export function isDmReactionInboxPreview(text: string | null | undefined): boolean {
  return parseDmReactionInboxPreview(text) !== null;
}

export function buildDmReactionInboxPreviewText(
  emoji: string,
  reactorDisplayName?: string | null,
): string {
  const trimmedName = reactorDisplayName?.trim();

  if (trimmedName) {
    return `${trimmedName} reacted ${emoji} to your message`;
  }

  return `${emoji} Reacted to your message`;
}

export function shouldApplyDmReactionInboxActivity(options: {
  currentUserId: string | null;
  messageAuthorUserId: string | null | undefined;
  reactorUserId: string | null | undefined;
}): boolean {
  const { currentUserId, messageAuthorUserId, reactorUserId } = options;

  if (!currentUserId?.trim() || !messageAuthorUserId?.trim() || !reactorUserId?.trim()) {
    return false;
  }

  if (messageAuthorUserId.trim() !== currentUserId.trim()) {
    return false;
  }

  return reactorUserId.trim() !== currentUserId.trim();
}

export function shouldMarkDmReactionInboxUnread(options: {
  eventType: "INSERT" | "UPDATE";
  currentUserId: string | null;
  messageAuthorUserId: string | null | undefined;
  reactorUserId: string | null | undefined;
}): boolean {
  if (options.eventType !== "INSERT") {
    return false;
  }

  return shouldApplyDmReactionInboxActivity(options);
}

export function buildDmInboxReactionActivity(options: {
  reaction: Pick<DmMessageReaction, "id" | "emoji" | "user_id" | "created_at">;
  conversationId: string;
  messageAuthorUserId: string;
}): DmInboxReactionActivity {
  return {
    conversationId: options.conversationId,
    reactionId: options.reaction.id,
    emoji: options.reaction.emoji,
    reactorUserId: options.reaction.user_id,
    activityAt: options.reaction.created_at,
    messageAuthorUserId: options.messageAuthorUserId,
  };
}

export function dmInboxReactionActivityToRowFields(
  activity: DmInboxReactionActivity,
): {
  latestActivityAt: string;
  latestPreview: string;
  latestMessageUserId: string;
} {
  return {
    latestActivityAt: activity.activityAt,
    latestPreview: encodeDmReactionInboxPreview(
      activity.reactionId,
      activity.emoji,
      activity.reactorUserId,
    ),
    latestMessageUserId: activity.reactorUserId,
  };
}

export async function listLatestDmReactionInboxActivities(
  currentUserId: string,
  conversationIds: string[],
): Promise<Map<string, DmInboxReactionActivity>> {
  if (!currentUserId.trim() || conversationIds.length === 0) {
    return new Map();
  }

  const { data: authoredMessages, error: messagesError } = await supabase
    .from("messages")
    .select("id, conversation_id")
    .in("conversation_id", conversationIds)
    .eq("user_id", currentUserId);

  if (messagesError) {
    throw messagesError;
  }

  const messageRows = authoredMessages ?? [];

  if (messageRows.length === 0) {
    return new Map();
  }

  const conversationByMessageId = new Map<string, string>();

  for (const row of messageRows) {
    if (row.id && row.conversation_id) {
      conversationByMessageId.set(row.id as string, row.conversation_id as string);
    }
  }

  const messageIds = [...conversationByMessageId.keys()];

  const { data: reactions, error: reactionsError } = await supabase
    .from("message_reactions")
    .select("id, emoji, user_id, created_at, message_id")
    .in("message_id", messageIds)
    .neq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (reactionsError) {
    throw reactionsError;
  }

  const latestByConversation = new Map<string, DmInboxReactionActivity>();

  for (const row of reactions ?? []) {
    const messageId = row.message_id as string;
    const conversationId = conversationByMessageId.get(messageId);

    if (!conversationId || latestByConversation.has(conversationId)) {
      continue;
    }

    latestByConversation.set(
      conversationId,
      buildDmInboxReactionActivity({
        reaction: row as Pick<DmMessageReaction, "id" | "emoji" | "user_id" | "created_at">,
        conversationId,
        messageAuthorUserId: currentUserId,
      }),
    );
  }

  return latestByConversation;
}

export async function loadDmReactionInboxMessageContext(
  messageId: string,
): Promise<{ conversationId: string; messageAuthorUserId: string } | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id, user_id, event_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const conversationId = data.conversation_id?.trim() ?? "";

  if (!conversationId || data.event_id) {
    return null;
  }

  const messageAuthorUserId = data.user_id?.trim() ?? "";

  if (!messageAuthorUserId) {
    return null;
  }

  return {
    conversationId,
    messageAuthorUserId,
  };
}
