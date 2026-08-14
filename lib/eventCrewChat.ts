import { supabase } from "@/lib/supabaseClient";
import { createNotification, formatNotificationPreview } from "@/lib/notifications";
import { markEventChatRead } from "@/lib/messageReads";
import { getEventById, isEventCancelled, type EventStatus } from "@/lib/events";
import {
  getCrewChatUnlockStateForEvent,
  type CrewChatUnlockState,
} from "@/lib/events/crewChatUnlock";
import { pickPreferredEventCoverImageUrl } from "@/lib/events/eventCoverImage";
import {
  getCurrentUserId,
  getCurrentUserProfile,
} from "@/lib/user/currentUser";
import {
  CREW_CHAT_EVENT_DETAIL_RETURN_PARAM,
  buildEventDetailHrefFromReturnQuery,
} from "@/lib/events/eventDetailCrewChatReturn";
import { CREW_CHAT_STARTED_NOTICE, formatCrewMemberJoinedNotice } from "@/lib/groupChatSystemMessages";
import { resolveUserDisplayName } from "@/lib/user/displayName";

export type EventCrewChatMessage = {
  id: string;
  event_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

export type EventCrewChatAccess = {
  canAccess: boolean;
  canStartCrewChat: boolean;
  isOwner: boolean;
  /** Event owner id, so the crew member list can mark the one participant who is the planner. */
  ownerId: string | null;
  unlock: CrewChatUnlockState;
  eventName: string | null;
  eventVenue: string | null;
  eventDate: string | null;
  eventSetTime: string | null;
  eventStatus: EventStatus | null;
  coverImageUrl: string | null;
  fallbackColour: string | null;
};

const EVENT_CREW_MESSAGE_FIELDS = "id, event_id, user_id, text, created_at";

export function getEventCrewChatLink(
  eventId: string,
  options?: { from?: string; tab?: string; eventDetailReturn?: string | null },
): string {
  const base = `/events/${eventId}/chat`;
  const params = new URLSearchParams();

  if (options?.from) {
    params.set("from", options.from);
  }

  if (options?.tab) {
    params.set("tab", options.tab);
  }

  const eventDetailReturn = options?.eventDetailReturn?.trim();

  if (eventDetailReturn && options?.from !== "dm") {
    params.set(CREW_CHAT_EVENT_DETAIL_RETURN_PARAM, eventDetailReturn);
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function buildEventDetailHrefFromCrewChatReturn(
  eventId: string,
  eventDetailReturn: string | null | undefined,
): string {
  return buildEventDetailHrefFromReturnQuery(eventId, eventDetailReturn);
}

export function getEventCrewChatBackHref(
  eventId: string,
  from: string | null | undefined,
  tab?: string | null,
  eventDetailReturn?: string | null,
  dmConversationId?: string | null,
  dmThreadContext?: {
    from?: string | null;
    tab?: string | null;
    eventId?: string | null;
    eventReturn?: string | null;
    calendarDate?: string | null;
    calendarView?: string | null;
    calendarMonth?: string | null;
    profileUserId?: string | null;
    profileFrom?: string | null;
    profileReturnTo?: string | null;
    fromTab?: string | null;
  } | null,
): string {
  if (from === "dm") {
    if (dmConversationId) {
      const params = new URLSearchParams();

      if (dmThreadContext) {
        if (dmThreadContext.from) {
          params.set("from", dmThreadContext.from);
        }
        if (dmThreadContext.tab) {
          params.set("tab", dmThreadContext.tab);
        }
        if (dmThreadContext.eventId) {
          params.set("eventId", dmThreadContext.eventId);
        }
        if (dmThreadContext.eventReturn) {
          params.set("eventReturn", dmThreadContext.eventReturn);
        }
        if (dmThreadContext.calendarDate) {
          params.set("calendarDate", dmThreadContext.calendarDate);
        }
        if (dmThreadContext.calendarView) {
          params.set("calendarView", dmThreadContext.calendarView);
        }
        if (dmThreadContext.calendarMonth) {
          params.set("calendarMonth", dmThreadContext.calendarMonth);
        }
        if (dmThreadContext.profileUserId) {
          params.set("profileUserId", dmThreadContext.profileUserId);
        }
        if (dmThreadContext.profileFrom) {
          params.set("profileFrom", dmThreadContext.profileFrom);
        }
        if (dmThreadContext.profileReturnTo) {
          params.set("profileReturnTo", dmThreadContext.profileReturnTo);
        }
        if (dmThreadContext.fromTab) {
          params.set("fromTab", dmThreadContext.fromTab);
        }
      }

      const query = params.toString();
      const base = `/dm/${dmConversationId}`;
      return query ? `${base}?${query}` : base;
    }
    return tab === "group" ? "/dm?tab=group" : "/dm";
  }

  return buildEventDetailHrefFromReturnQuery(eventId, eventDetailReturn);
}

function buildDeniedAccess(
  event: Awaited<ReturnType<typeof getEventById>>,
  unlock: CrewChatUnlockState,
  isOwner: boolean,
): EventCrewChatAccess {
  return {
    canAccess: false,
    canStartCrewChat: isOwner && unlock.canPlannerStart,
    isOwner,
    ownerId: event?.owner_id ?? null,
    unlock,
    eventName: event?.name ?? null,
    eventVenue: event?.venue ?? null,
    eventDate: event?.event_date ?? null,
    eventSetTime: event?.set_time ?? null,
    eventStatus: event?.status ?? null,
    coverImageUrl: pickPreferredEventCoverImageUrl(event?.cover_image_url),
    fallbackColour: event?.fallback_colour?.trim() || null,
  };
}

export async function getEventCrewChatAccess(eventId: string): Promise<EventCrewChatAccess> {
  const [userId, event] = await Promise.all([getCurrentUserId(), getEventById(eventId)]);

  if (!event) {
    return buildDeniedAccess(
      null,
      {
        acceptedDjCount: 0,
        crewChatStartedAt: null,
        isUnlocked: false,
        canPlannerStart: false,
      },
      false,
    );
  }

  const unlock = await getCrewChatUnlockStateForEvent(event);
  const isOwner = event.owner_id === userId;

  if (isEventCancelled(event)) {
    return buildDeniedAccess(event, unlock, isOwner);
  }

  if (!unlock.isUnlocked) {
    return buildDeniedAccess(event, unlock, isOwner);
  }

  if (isOwner) {
    return {
      canAccess: true,
      canStartCrewChat: false,
      isOwner: true,
      ownerId: event.owner_id,
      unlock,
      eventName: event.name,
      eventVenue: event.venue,
      eventDate: event.event_date,
      eventSetTime: event.set_time,
      eventStatus: event.status,
      coverImageUrl: pickPreferredEventCoverImageUrl(event.cover_image_url),
      fallbackColour: event.fallback_colour?.trim() || null,
    };
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("event_id", eventId)
    .eq("recipient_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  if (error) {
    console.error("[eventCrewChat] Failed to check accepted booking access:", error);
    return buildDeniedAccess(event, unlock, false);
  }

  if (!data) {
    return buildDeniedAccess(event, unlock, false);
  }

  return {
    canAccess: true,
    canStartCrewChat: false,
    isOwner: false,
    ownerId: event.owner_id,
    unlock,
    eventName: event.name,
    eventVenue: event.venue,
    eventDate: event.event_date,
    eventSetTime: event.set_time,
    eventStatus: event.status,
    coverImageUrl: pickPreferredEventCoverImageUrl(event.cover_image_url),
    fallbackColour: event.fallback_colour?.trim() || null,
  };
}

export async function listEventCrewChatMessages(
  eventId: string,
): Promise<EventCrewChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(EVENT_CREW_MESSAGE_FIELDS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as EventCrewChatMessage[];
}

export async function getEventCrewParticipantIds(eventId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_event_crew_participant_ids", {
    p_event_id: eventId,
  });

  if (error) {
    throw error;
  }

  return [...new Set(((data ?? []) as string[]).filter(Boolean))];
}

/**
 * After crew chat unlocks (manual Start or auto-start on 2nd accept):
 * 1. Insert a system notice so Crew Chats can show unread until opened
 * 2. Notify every other crew member (badge + inbox refetch)
 *
 * Start only writes `events.crew_chat_started_at` — without a message, unread
 * math has nothing to attach to. Soft-fail per step.
 */
export async function notifyCrewChatStarted(options: {
  eventId: string;
  eventName: string;
}): Promise<void> {
  const { eventId } = options;
  const eventName = options.eventName.trim() || "Crew chat";
  const link = getEventCrewChatLink(eventId);

  let senderId: string;
  let participants: string[];

  try {
    senderId = await getCurrentUserId();
    participants = await getEventCrewParticipantIds(eventId);
  } catch (loadError) {
    console.error("[eventCrewChat] Crew chat start notify setup failed:", loadError);
    return;
  }

  const { error: insertError } = await supabase.from("messages").insert({
    event_id: eventId,
    user_id: senderId,
    text: CREW_CHAT_STARTED_NOTICE,
  });

  if (insertError) {
    console.error("[eventCrewChat] Failed to insert crew started system message:", insertError);
  } else {
    try {
      await markEventChatRead(eventId);
    } catch (readError) {
      console.error("[eventCrewChat] Failed to mark crew chat read after start notice:", readError);
    }
  }

  await Promise.all(
    participants
      .filter((participantId) => participantId !== senderId)
      .map(async (participantId) => {
        try {
          await createNotification(
            participantId,
            "message",
            `${eventName} · Crew chat ready`,
            "Your event crew chat is now available",
            link,
          );
        } catch (notificationError) {
          console.error(
            "[eventCrewChat] Crew chat started but notification failed:",
            participantId,
            notificationError,
          );
        }
      }),
  );
}

/**
 * After a DJ accepts into an unlocked crew chat: insert "{name} joined the crew"
 * so other DJs get an Instagram-style pill + inbox unread. Notify other DJs only
 * (not the planner, not the joiner). Soft-fail.
 */
export async function notifyCrewMemberJoined(options: {
  eventId: string;
  eventName: string;
  ownerId: string;
  /** When true, insert the pill/unread seed but skip push (e.g. auto-start already notified). */
  skipNotification?: boolean;
}): Promise<void> {
  const { eventId, ownerId, skipNotification = false } = options;
  const eventName = options.eventName.trim() || "Crew chat";
  const link = getEventCrewChatLink(eventId);
  const ownerKey = ownerId.trim();

  let joinerId: string;
  let participants: string[];
  let joinerProfile;

  try {
    joinerId = await getCurrentUserId();
    joinerProfile = await getCurrentUserProfile();
    participants = await getEventCrewParticipantIds(eventId);
  } catch (loadError) {
    console.error("[eventCrewChat] Crew join notify setup failed:", loadError);
    return;
  }

  // Planner accepting into their own event as DJ/both is rare; never fan-out a
  // join notice as if the owner "joined" the crew they run.
  if (ownerKey && joinerId === ownerKey) {
    return;
  }

  const joinerName = resolveUserDisplayName(joinerProfile, { fallback: "Someone" });
  const noticeText = formatCrewMemberJoinedNotice(joinerName);

  const { error: insertError } = await supabase.from("messages").insert({
    event_id: eventId,
    user_id: joinerId,
    text: noticeText,
  });

  if (insertError) {
    console.error("[eventCrewChat] Failed to insert crew join system message:", insertError);
    return;
  }

  try {
    await markEventChatRead(eventId);
  } catch (readError) {
    console.error("[eventCrewChat] Failed to mark crew chat read after join notice:", readError);
  }

  if (skipNotification) {
    return;
  }

  await Promise.all(
    participants
      .filter((participantId) => participantId !== joinerId && participantId !== ownerKey)
      .map(async (participantId) => {
        try {
          await createNotification(
            participantId,
            "message",
            eventName,
            noticeText,
            link,
          );
        } catch (notificationError) {
          console.error(
            "[eventCrewChat] Crew join notify failed:",
            participantId,
            notificationError,
          );
        }
      }),
  );
}

export async function sendEventCrewChatMessage(
  eventId: string,
  text: string,
  eventName: string,
  options?: { notifyParticipants?: boolean },
): Promise<void> {
  const userId = await getCurrentUserId();
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  const event = await getEventById(eventId);

  if (!event || isEventCancelled(event)) {
    throw new Error("This event was cancelled. Group chat is no longer available.");
  }

  const unlock = await getCrewChatUnlockStateForEvent(event);

  if (!unlock.isUnlocked) {
    throw new Error("Crew chat is not available for this event yet");
  }

  const { error: insertError } = await supabase.from("messages").insert({
    event_id: eventId,
    user_id: userId,
    text: trimmed,
  });

  if (insertError) {
    throw insertError;
  }

  await markEventChatRead(eventId);

  if (options?.notifyParticipants === false) {
    return;
  }

  let participants: string[] = [];

  try {
    participants = await getEventCrewParticipantIds(eventId);
  } catch (participantError) {
    console.error(
      "[eventCrewChat] Failed to load crew participants for notifications:",
      participantError,
    );
    return;
  }

  const senderProfile = await getCurrentUserProfile();

  const senderName = senderProfile?.display_name?.trim() || "Group member";
  const preview = formatNotificationPreview(trimmed);
  const link = getEventCrewChatLink(eventId);
  const title = `${senderName} · ${eventName}`;

  await Promise.all(
    participants
      .filter((participantId) => participantId !== userId)
      .map(async (participantId) => {
        try {
          await createNotification(
            participantId,
            "message",
            title,
            preview,
            link,
          );
        } catch (notificationError) {
          console.error(
            "[eventCrewChat] Group message posted but notification failed:",
            participantId,
            notificationError,
          );
        }
      }),
  );
}

export function getEventCrewChatLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.code === "42501") {
      return "You do not have access to this group chat";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load group chat";
}
