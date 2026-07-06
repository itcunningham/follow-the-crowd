import { listAccessibleGroupChatEventIds, loadLatestGroupChatPreviews } from "@/lib/groupChats";
import {
  getUnreadConversationIds,
  getUnreadEventChatIds,
  type LatestChatMessage,
} from "@/lib/messageReads";
import { markNotificationsReadForLink } from "@/lib/notifications";
import { getEventCrewChatLink } from "@/lib/eventCrewChat";
import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/user/currentUser";

export type InboxUnreadCounts = {
  dm: number;
  group: number;
  total: number;
};

async function loadLatestDmMessagesByConversation(
  conversationIds: string[],
): Promise<Map<string, LatestChatMessage>> {
  const latestByConversation = new Map<string, LatestChatMessage>();

  if (conversationIds.length === 0) {
    return latestByConversation;
  }

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id, user_id, created_at")
    .in("conversation_id", conversationIds)
    .not("conversation_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const conversationId = row.conversation_id as string | null;

    if (!conversationId || latestByConversation.has(conversationId)) {
      continue;
    }

    latestByConversation.set(conversationId, {
      user_id: row.user_id as string,
      created_at: row.created_at as string,
    });
  }

  return latestByConversation;
}

export async function getInboxUnreadCounts(
  userId: string,
  role: UserRole | null,
): Promise<InboxUnreadCounts> {
  const { data: memberRows, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membersError) {
    throw membersError;
  }

  const conversationIds = [
    ...new Set(
      (memberRows ?? [])
        .map((row) => row.conversation_id as string | null)
        .filter((conversationId): conversationId is string => Boolean(conversationId)),
    ),
  ];

  const [latestConversationMessages, accessibleEventIds] = await Promise.all([
    loadLatestDmMessagesByConversation(conversationIds),
    listAccessibleGroupChatEventIds(role),
  ]);

  let latestEventMessages = new Map<string, LatestChatMessage>();

  if (accessibleEventIds.length > 0) {
    try {
      const previews = await loadLatestGroupChatPreviews(accessibleEventIds);

      for (const [eventId, preview] of previews) {
        latestEventMessages.set(eventId, {
          user_id: preview.userId,
          created_at: preview.createdAt,
        });
      }
    } catch (previewError) {
      console.error("[inboxUnread] Failed to load group chat previews for unread counts:", previewError);
    }
  }

  const [dmUnread, groupUnread] = await Promise.all([
    getUnreadConversationIds(conversationIds, latestConversationMessages, userId),
    getUnreadEventChatIds(accessibleEventIds, latestEventMessages, userId),
  ]);

  return {
    dm: dmUnread.size,
    group: groupUnread.size,
    total: dmUnread.size + groupUnread.size,
  };
}

export async function syncReadInboxNotifications(
  userId: string,
  options: {
    conversationIds: string[];
    unreadConversationIds: Set<string>;
    eventIds: string[];
    unreadEventIds: Set<string>;
  },
): Promise<void> {
  const tasks: Promise<void>[] = [];

  for (const conversationId of options.conversationIds) {
    if (!options.unreadConversationIds.has(conversationId)) {
      tasks.push(markNotificationsReadForLink(userId, `/dm/${conversationId}`));
    }
  }

  for (const eventId of options.eventIds) {
    if (!options.unreadEventIds.has(eventId)) {
      tasks.push(
        markNotificationsReadForLink(
          userId,
          getEventCrewChatLink(eventId, { from: "dm", tab: "group" }),
        ),
      );
      tasks.push(markNotificationsReadForLink(userId, getEventCrewChatLink(eventId)));
    }
  }

  await Promise.all(tasks);
}
