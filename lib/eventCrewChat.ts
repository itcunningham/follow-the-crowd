import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notifications";
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
  unlock: CrewChatUnlockState;
  eventName: string | null;
  eventVenue: string | null;
  eventDate: string | null;
  eventStatus: EventStatus | null;
  coverImageUrl: string | null;
  fallbackColour: string | null;
};

const EVENT_CREW_MESSAGE_FIELDS = "id, event_id, user_id, text, created_at";

export function getEventCrewChatLink(
  eventId: string,
  options?: { from?: string; tab?: string },
): string {
  const base = `/events/${eventId}/chat`;
  const params = new URLSearchParams();

  if (options?.from) {
    params.set("from", options.from);
  }

  if (options?.tab) {
    params.set("tab", options.tab);
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function getEventCrewChatBackHref(
  eventId: string,
  from: string | null | undefined,
  tab?: string | null,
): string {
  if (from === "dm") {
    return tab === "group" ? "/dm?tab=group" : "/dm";
  }

  return `/events/${eventId}`;
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
    unlock,
    eventName: event?.name ?? null,
    eventVenue: event?.venue ?? null,
    eventDate: event?.event_date ?? null,
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
      unlock,
      eventName: event.name,
      eventVenue: event.venue,
      eventDate: event.event_date,
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
    unlock,
    eventName: event.name,
    eventVenue: event.venue,
    eventDate: event.event_date,
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
    throw new Error("Crew chat is not available for this event yet.");
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
  const preview =
    trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
  const link = getEventCrewChatLink(eventId);

  await Promise.all(
    participants
      .filter((participantId) => participantId !== userId)
      .map(async (participantId) => {
        try {
          await createNotification(
            participantId,
            "message",
            eventName,
            `${senderName}: ${preview}`,
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
      return "You do not have access to this group chat.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load group chat";
}
