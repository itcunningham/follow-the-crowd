import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notifications";
import { getEventById, type EventStatus } from "@/lib/events";
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
  isOwner: boolean;
  eventName: string | null;
  eventVenue: string | null;
  eventDate: string | null;
  eventStatus: EventStatus | null;
  coverImageUrl: string | null;
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

export async function getEventCrewChatAccess(eventId: string): Promise<EventCrewChatAccess> {
  const userId = await getCurrentUserId();
  const event = await getEventById(eventId);

  if (!event) {
    return {
      canAccess: false,
      isOwner: false,
      eventName: null,
      eventVenue: null,
      eventDate: null,
      eventStatus: null,
      coverImageUrl: null,
    };
  }

  const eventContext = {
    eventName: event.name,
    eventVenue: event.venue,
    eventDate: event.event_date,
    eventStatus: event.status,
    coverImageUrl: event.cover_image_url,
  };

  const isOwner = event.owner_id === userId;

  if (isOwner) {
    return { canAccess: true, isOwner: true, ...eventContext };
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
    return { canAccess: false, isOwner: false, ...eventContext };
  }

  return {
    canAccess: Boolean(data),
    isOwner: false,
    ...eventContext,
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

async function getEventCrewParticipantIds(eventId: string): Promise<string[]> {
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
): Promise<void> {
  const userId = await getCurrentUserId();
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  const { error: insertError } = await supabase.from("messages").insert({
    event_id: eventId,
    user_id: userId,
    text: trimmed,
  });

  if (insertError) {
    throw insertError;
  }

  const [participants, senderProfile] = await Promise.all([
    getEventCrewParticipantIds(eventId),
    getCurrentUserProfile(),
  ]);

  const senderName = senderProfile?.display_name?.trim() || "Group member";
  const preview =
    trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
  const link = getEventCrewChatLink(eventId);

  await Promise.all(
    participants
      .filter((participantId) => participantId !== userId)
      .map((participantId) =>
        createNotification(
          participantId,
          "message",
          eventName,
          `${senderName}: ${preview}`,
          link,
        ),
      ),
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
