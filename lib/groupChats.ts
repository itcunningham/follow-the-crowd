import { getEventCrewChatLink } from "@/lib/eventCrewChat";
import {
  getInboxActivityTimestamp,
  logInboxRenderOrder,
  normalizeInboxId,
} from "@/lib/dmInbox";
import { listOwnedEvents } from "@/lib/events";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId, type UserRole } from "@/lib/user/currentUser";

export type GroupChatListItem = {
  eventId: string;
  eventName: string;
  venue: string;
  eventDate: string;
  coverImageUrl: string | null;
  fallbackColour: string | null;
  href: string;
  latestPreview: string | null;
  latestMessageAt: string | null;
  latestMessageUserId: string | null;
  latestActivityAt: string | null;
};

type GroupChatListItemBase = Omit<
  GroupChatListItem,
  "latestPreview" | "latestMessageAt" | "latestMessageUserId" | "latestActivityAt"
>;

export type GroupChatPreview = {
  text: string;
  createdAt: string;
  userId: string;
};

export type GroupChatRealtimeMessage = {
  id: string;
  text: string;
  created_at?: string | null;
  user_id: string;
  event_id?: string | null;
  group_chat_id?: string | null;
  chat_id?: string | null;
};

export function extractGroupChatTargetId(
  message: Pick<
    GroupChatRealtimeMessage,
    "event_id" | "group_chat_id" | "chat_id"
  >,
): string | null {
  for (const candidate of [message.event_id, message.group_chat_id, message.chat_id]) {
    if (candidate === null || candidate === undefined) {
      continue;
    }

    const normalized = String(candidate).trim();

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function logGroupRenderedRowIds(groupChats: GroupChatListItem[]) {
  console.log(
    "[Group rendered row ids]",
    groupChats.map((chat) => ({
      eventId: chat.eventId,
      latestActivityAt: chat.latestActivityAt,
    })),
  );
}

function withGroupActivityFields(
  item: GroupChatListItemBase,
  preview: GroupChatPreview | undefined,
): GroupChatListItem {
  const latestActivityAt = preview?.createdAt ?? null;

  return {
    ...item,
    latestPreview: preview?.text.trim() ? preview.text.trim() : null,
    latestMessageAt: latestActivityAt,
    latestMessageUserId: preview?.userId ?? null,
    latestActivityAt,
  };
}

export async function loadLatestGroupChatPreviews(
  eventIds: string[],
): Promise<Map<string, GroupChatPreview>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("messages")
    .select("event_id, text, created_at, user_id")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const previews = new Map<string, GroupChatPreview>();

  for (const row of data ?? []) {
    const eventId = row.event_id as string | null;
    const normalizedEventId = normalizeInboxId(eventId);

    if (!normalizedEventId || previews.has(normalizedEventId)) {
      continue;
    }

    previews.set(normalizedEventId, {
      text: (row.text as string) ?? "",
      createdAt: row.created_at as string,
      userId: row.user_id as string,
    });
  }

  return previews;
}

async function attachLatestGroupChatPreviews(
  items: GroupChatListItemBase[],
): Promise<GroupChatListItem[]> {
  if (items.length === 0) {
    return [];
  }

  let previews = new Map<string, GroupChatPreview>();

  try {
    previews = await loadLatestGroupChatPreviews(items.map((item) => item.eventId));
  } catch (previewError) {
    console.error("[groupChats] Failed to load latest group chat previews:", previewError);
  }

  return items.map((item) =>
    withGroupActivityFields(item, previews.get(normalizeInboxId(item.eventId))),
  );
}

export async function listAccessibleGroupChats(
  role: UserRole | null,
): Promise<GroupChatListItem[]> {
  const userId = await getCurrentUserId();
  const byEventId = new Map<string, GroupChatListItemBase>();

  if (role === "promoter" || role === "both") {
    const events = await listOwnedEvents();

    for (const event of events) {
      byEventId.set(event.id, {
        eventId: event.id,
        eventName: event.name.trim() || "Untitled event",
        venue: event.venue,
        eventDate: event.event_date,
        coverImageUrl: event.cover_image_url?.trim() || null,
        fallbackColour: event.fallback_colour?.trim() || null,
        href: getEventCrewChatLink(event.id, { from: "dm", tab: "group" }),
      });
    }
  }

  if (role === "dj" || role === "both") {
    const { data, error } = await supabase
      .from("booking_requests")
      .select("event_id")
      .eq("recipient_id", userId)
      .eq("status", "accepted")
      .not("event_id", "is", null);

    if (error) {
      throw error;
    }

    const eventIds = [
      ...new Set(
        (data ?? [])
          .map((row) => row.event_id as string | null)
          .filter((eventId): eventId is string => Boolean(eventId)),
      ),
    ];

    if (eventIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, name, venue, event_date, cover_image_url, fallback_colour")
        .in("id", eventIds);

      if (eventsError) {
        throw eventsError;
      }

      for (const event of events ?? []) {
        if (byEventId.has(event.id)) {
          continue;
        }

        byEventId.set(event.id, {
          eventId: event.id,
          eventName: (event.name as string).trim() || "Untitled event",
          venue: event.venue as string,
          eventDate: event.event_date as string,
          coverImageUrl:
            ((event as { cover_image_url?: string | null }).cover_image_url?.trim()) || null,
          fallbackColour:
            ((event as { fallback_colour?: string | null }).fallback_colour?.trim()) || null,
          href: getEventCrewChatLink(event.id, { from: "dm", tab: "group" }),
        });
      }
    }
  }

  return sortGroupChatsByLatestActivity(
    await attachLatestGroupChatPreviews([...byEventId.values()]),
  );
}

export function mergeLoadedGroupChatsWithLiveActivity(
  live: GroupChatListItem[],
  loaded: GroupChatListItem[],
): GroupChatListItem[] {
  if (live.length === 0) {
    return sortGroupChatsByLatestActivity(loaded);
  }

  const liveByEventId = new Map(
    live.map((chat) => [normalizeInboxId(chat.eventId), chat]),
  );

  const merged = loaded.map((chat) => {
    const liveChat = liveByEventId.get(normalizeInboxId(chat.eventId));

    if (!liveChat?.latestActivityAt) {
      return chat;
    }

    const liveTime = getInboxActivityTimestamp(liveChat.latestActivityAt, null);
    const loadedTime = getInboxActivityTimestamp(chat.latestActivityAt, null);

    if (liveTime <= loadedTime) {
      return chat;
    }

    return {
      ...chat,
      latestPreview: liveChat.latestPreview,
      latestMessageAt: liveChat.latestMessageAt,
      latestMessageUserId: liveChat.latestMessageUserId,
      latestActivityAt: liveChat.latestActivityAt,
    };
  });

  return sortGroupChatsByLatestActivity(merged);
}

export function applyInboxGroupMessage(
  groupChats: GroupChatListItem[],
  targetEventId: string,
  newMessage: GroupChatRealtimeMessage,
): { rows: GroupChatListItem[]; matched: boolean } {
  const normalizedTargetId = normalizeInboxId(String(targetEventId).trim());
  const latestActivityAt =
    newMessage.created_at?.trim() || new Date().toISOString();
  let matched = false;

  const updated = groupChats.map((chat) => {
    if (normalizeInboxId(chat.eventId) !== normalizedTargetId) {
      return chat;
    }

    matched = true;

    return {
      ...chat,
      latestPreview: newMessage.text.trim() || null,
      latestMessageAt: latestActivityAt,
      latestMessageUserId: newMessage.user_id,
      latestActivityAt,
    };
  });

  console.log("[Group matched", matched);

  if (!matched) {
    return { rows: groupChats, matched: false };
  }

  const beforeIds = groupChats.map((chat) => chat.eventId);
  const sorted = sortGroupChatsByLatestActivity(updated);
  const afterIds = sorted.map((chat) => chat.eventId);

  console.log("[Group sort before]", beforeIds);
  console.log("[Group sort after]", afterIds, {
    targetEventId: String(targetEventId).trim(),
    messageId: newMessage.id,
    latestActivityAt,
  });

  return { rows: [...sorted], matched: true };
}

export function sortGroupChatsByLatestActivity(
  chats: GroupChatListItem[],
): GroupChatListItem[] {
  return [...chats].sort((left, right) => {
    const leftHasActivity = Boolean(left.latestActivityAt?.trim());
    const rightHasActivity = Boolean(right.latestActivityAt?.trim());

    if (leftHasActivity !== rightHasActivity) {
      return leftHasActivity ? -1 : 1;
    }

    const leftTime = leftHasActivity
      ? getInboxActivityTimestamp(left.latestActivityAt, null)
      : getInboxActivityTimestamp(null, left.eventDate);
    const rightTime = rightHasActivity
      ? getInboxActivityTimestamp(right.latestActivityAt, null)
      : getInboxActivityTimestamp(null, right.eventDate);

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.eventName.localeCompare(right.eventName);
  });
}

export function formatGroupChatEventDate(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Date TBC";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return trimmed;
}

export function getGroupChatsLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load group chats";
}

export function isGroupChatPath(pathname: string): boolean {
  return pathname === "/group-chats" || /^\/events\/[^/]+\/chat\/?$/.test(pathname);
}

export function isMessagesInboxPath(pathname: string): boolean {
  return pathname === "/dm" || pathname.startsWith("/dm/") || isGroupChatPath(pathname);
}

export { logInboxRenderOrder };
