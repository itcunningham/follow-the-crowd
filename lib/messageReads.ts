import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export type MessageReadRow = {
  conversation_id: string | null;
  event_id: string | null;
  last_read_at: string;
};

export type LatestChatMessage = {
  user_id: string;
  created_at: string;
};

export function isChatUnread(
  latestMessage: LatestChatMessage | null | undefined,
  currentUserId: string | null,
  lastReadAt: string | null | undefined,
): boolean {
  if (!latestMessage || !currentUserId) {
    return false;
  }

  if (latestMessage.user_id === currentUserId) {
    return false;
  }

  if (!lastReadAt) {
    return true;
  }

  return new Date(latestMessage.created_at).getTime() > new Date(lastReadAt).getTime();
}

export async function loadMessageReadsForUser(userId: string): Promise<MessageReadRow[]> {
  const { data, error } = await supabase
    .from("message_reads")
    .select("conversation_id, event_id, last_read_at")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []) as MessageReadRow[];
}

export function buildConversationReadMap(rows: MessageReadRow[]) {
  const readMap = new Map<string, string>();

  for (const row of rows) {
    if (row.conversation_id) {
      readMap.set(row.conversation_id, row.last_read_at);
    }
  }

  return readMap;
}

export function buildEventChatReadMap(rows: MessageReadRow[]) {
  const readMap = new Map<string, string>();

  for (const row of rows) {
    if (row.event_id) {
      readMap.set(row.event_id, row.last_read_at);
    }
  }

  return readMap;
}

export async function getUnreadConversationIds(
  conversationIds: string[],
  latestMessages: Map<string, LatestChatMessage>,
  currentUserId: string,
): Promise<Set<string>> {
  if (conversationIds.length === 0) {
    return new Set();
  }

  const rows = await loadMessageReadsForUser(currentUserId);
  const readMap = buildConversationReadMap(rows);
  const unread = new Set<string>();

  for (const conversationId of conversationIds) {
    if (
      isChatUnread(latestMessages.get(conversationId), currentUserId, readMap.get(conversationId))
    ) {
      unread.add(conversationId);
    }
  }

  return unread;
}

export async function getUnreadEventChatIds(
  eventIds: string[],
  latestMessages: Map<string, LatestChatMessage>,
  currentUserId: string,
): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const rows = await loadMessageReadsForUser(currentUserId);
  const readMap = buildEventChatReadMap(rows);
  const unread = new Set<string>();

  for (const eventId of eventIds) {
    if (isChatUnread(latestMessages.get(eventId), currentUserId, readMap.get(eventId))) {
      unread.add(eventId);
    }
  }

  return unread;
}

export function resolveMarkReadTimestamp(readThroughCreatedAt?: string | null): string {
  const nowMs = Date.now();
  const readThroughMs = readThroughCreatedAt
    ? new Date(readThroughCreatedAt).getTime()
    : Number.NEGATIVE_INFINITY;

  if (!Number.isFinite(readThroughMs)) {
    return new Date(nowMs).toISOString();
  }

  return new Date(Math.max(nowMs, readThroughMs)).toISOString();
}

async function upsertMessageRead(
  values: {
    conversation_id?: string;
    event_id?: string;
  },
  lastReadAt: string,
) {
  const userId = await getCurrentUserId();

  let query = supabase.from("message_reads").select("id").eq("user_id", userId);

  if (values.conversation_id) {
    query = query.eq("conversation_id", values.conversation_id).is("event_id", null);
  } else if (values.event_id) {
    query = query.eq("event_id", values.event_id).is("conversation_id", null);
  }

  const { data: existing, error: selectError } = await query.maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("message_reads")
      .update({ last_read_at: lastReadAt })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase.from("message_reads").insert({
    user_id: userId,
    conversation_id: values.conversation_id ?? null,
    event_id: values.event_id ?? null,
    last_read_at: lastReadAt,
  });

  if (insertError) {
    throw insertError;
  }
}

export async function markConversationRead(
  conversationId: string,
  options?: { readThroughCreatedAt?: string | null },
) {
  const userId = await getCurrentUserId();
  const lastReadAt = resolveMarkReadTimestamp(options?.readThroughCreatedAt);

  console.log("[reads] current user id", userId);
  console.log("[reads] conversation id", conversationId);

  try {
    await upsertMessageRead({ conversation_id: conversationId }, lastReadAt);
    console.log("[reads] mark read result", {
      conversationId,
      userId,
      lastReadAt,
      readThroughCreatedAt: options?.readThroughCreatedAt ?? null,
    });
  } catch (error) {
    console.log("[reads] mark read result", {
      conversationId,
      userId,
      error: getMessageReadsLoadErrorMessage(error),
    });
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ftc-message-reads-updated"));
  }
}

export async function markEventChatRead(eventId: string) {
  await upsertMessageRead({ event_id: eventId }, resolveMarkReadTimestamp());

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ftc-message-reads-updated"));
  }
}

export function isMessageSeenByReader(
  messageCreatedAt: string,
  readerLastReadAt: string | null | undefined,
): boolean {
  if (!readerLastReadAt) {
    return false;
  }

  return new Date(readerLastReadAt).getTime() >= new Date(messageCreatedAt).getTime();
}

export function shouldShowDmReadReceipts(options: {
  isBlocked: boolean;
  otherUserDisplayName: string | null | undefined;
}): boolean {
  if (options.isBlocked) {
    return false;
  }

  return options.otherUserDisplayName?.trim() !== "Deleted User";
}

export function getLatestOwnDmMessageId(
  messages: Array<{ id: string; user_id: string; text: string }>,
  currentUserId: string,
  isEligibleOwnMessage: (message: { id: string; user_id: string; text: string }) => boolean,
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.user_id !== currentUserId) {
      continue;
    }

    if (!isEligibleOwnMessage(message)) {
      continue;
    }

    return message.id;
  }

  return null;
}

export async function loadDmParticipantLastReadAt(
  conversationId: string,
  participantUserId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("message_reads")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", participantUserId)
    .is("event_id", null)
    .maybeSingle();

  if (error) {
    console.log("[reads] other participant id", participantUserId);
    console.log("[reads] loaded other last_read_at", null);
    console.log("[reads] loaded other last_read_at error", getMessageReadsLoadErrorMessage(error));
    throw error;
  }

  const lastReadAt = data?.last_read_at ?? null;

  console.log("[reads] other participant id", participantUserId);
  console.log("[reads] loaded other last_read_at", lastReadAt);

  return lastReadAt;
}

export function getMessageReadsLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string };

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load message read state";
}
