import { getEventCrewChatLink } from "@/lib/eventCrewChat";
import { listOwnedEvents } from "@/lib/events";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId, type UserRole } from "@/lib/user/currentUser";

export type GroupChatListItem = {
  eventId: string;
  eventName: string;
  venue: string;
  eventDate: string;
  href: string;
  latestPreview: string | null;
  latestMessageAt: string | null;
};

type GroupChatListItemBase = Omit<GroupChatListItem, "latestPreview" | "latestMessageAt">;

export type GroupChatPreview = {
  text: string;
  createdAt: string;
  userId: string;
};

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

    if (!eventId || previews.has(eventId)) {
      continue;
    }

    previews.set(eventId, {
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

  return items.map((item) => {
    const preview = previews.get(item.eventId);

    return {
      ...item,
      latestPreview: preview?.text.trim() ? preview.text.trim() : null,
      latestMessageAt: preview?.createdAt ?? null,
    };
  });
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
        href: getEventCrewChatLink(event.id),
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
        .select("id, name, venue, event_date")
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
          href: getEventCrewChatLink(event.id),
        });
      }
    }
  }

  const sorted = [...byEventId.values()].sort((left, right) => {
    const dateCompare = left.eventDate.localeCompare(right.eventDate);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return left.eventName.localeCompare(right.eventName);
  });

  return attachLatestGroupChatPreviews(sorted);
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
