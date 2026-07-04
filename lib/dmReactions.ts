import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export type DmMessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export const DM_QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

export const DM_COMPOSER_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🔥",
  "👍",
  "🙏",
  "🎉",
  "💯",
  "😎",
  "🤝",
  "✨",
  "❤️",
] as const;

const REACTION_SELECT = "id, message_id, user_id, emoji, created_at";

export type DmReactionSummary = {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  userIds: string[];
};

export async function listDmReactionsForConversation(
  conversationId: string,
): Promise<DmMessageReaction[]> {
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId);

  if (messagesError) {
    throw messagesError;
  }

  const messageIds = (messages ?? []).map((row) => row.id as string);

  if (messageIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("message_reactions")
    .select(REACTION_SELECT)
    .in("message_id", messageIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DmMessageReaction[];
}

export function groupDmReactionsByMessageId(
  reactions: ReadonlyArray<DmMessageReaction>,
): Map<string, DmMessageReaction[]> {
  const grouped = new Map<string, DmMessageReaction[]>();

  for (const reaction of reactions) {
    const existing = grouped.get(reaction.message_id) ?? [];
    existing.push(reaction);
    grouped.set(reaction.message_id, existing);
  }

  return grouped;
}

export function summarizeDmReactions(
  reactions: ReadonlyArray<DmMessageReaction>,
  currentUserId: string | null,
): DmReactionSummary[] {
  const byEmoji = new Map<string, DmReactionSummary>();

  for (const reaction of reactions) {
    const existing = byEmoji.get(reaction.emoji);

    if (existing) {
      existing.count += 1;
      existing.userIds.push(reaction.user_id);

      if (currentUserId && reaction.user_id === currentUserId) {
        existing.reactedByCurrentUser = true;
      }

      continue;
    }

    byEmoji.set(reaction.emoji, {
      emoji: reaction.emoji,
      count: 1,
      reactedByCurrentUser: Boolean(currentUserId && reaction.user_id === currentUserId),
      userIds: [reaction.user_id],
    });
  }

  return [...byEmoji.values()].sort((left, right) => right.count - left.count);
}

export async function toggleDmMessageReaction(
  messageId: string,
  emoji: string,
): Promise<DmMessageReaction | null> {
  const userId = await getCurrentUserId();

  const { data: existingRows, error: existingError } = await supabase
    .from("message_reactions")
    .select(REACTION_SELECT)
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existing = (existingRows?.[0] ?? null) as DmMessageReaction | null;

  if (existing?.emoji === emoji) {
    const { error: deleteError } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      throw deleteError;
    }

    return null;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("message_reactions")
      .update({ emoji })
      .eq("id", existing.id)
      .select(REACTION_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return data as DmMessageReaction;
  }

  const { data, error } = await supabase
    .from("message_reactions")
    .insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    })
    .select(REACTION_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as DmMessageReaction;
}

export function upsertDmReactionInList(
  reactions: DmMessageReaction[],
  nextReaction: DmMessageReaction | null,
  messageId: string,
  userId: string,
): DmMessageReaction[] {
  const withoutUserReaction = reactions.filter(
    (reaction) => !(reaction.message_id === messageId && reaction.user_id === userId),
  );

  if (!nextReaction) {
    return withoutUserReaction;
  }

  return [...withoutUserReaction, nextReaction];
}
