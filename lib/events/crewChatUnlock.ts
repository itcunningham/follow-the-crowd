import type { Event } from "@/lib/events";
import { isEventCancelled } from "@/lib/events";
import { supabase } from "@/lib/supabaseClient";

export type CrewChatUnlockState = {
  acceptedDjCount: number;
  crewChatStartedAt: string | null;
  isUnlocked: boolean;
  canPlannerStart: boolean;
};

export function normalizeCrewChatStartedAt(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function resolveCrewChatUnlockState(
  event: Pick<Event, "status" | "crew_chat_started_at">,
  acceptedDjCount: number,
): CrewChatUnlockState {
  const crewChatStartedAt = normalizeCrewChatStartedAt(event.crew_chat_started_at);
  const isUnlocked =
    !isEventCancelled(event) &&
    acceptedDjCount >= 1 &&
    crewChatStartedAt !== null;
  const canPlannerStart =
    !isEventCancelled(event) &&
    acceptedDjCount >= 1 &&
    acceptedDjCount < 2 &&
    crewChatStartedAt === null;

  return {
    acceptedDjCount,
    crewChatStartedAt,
    isUnlocked,
    canPlannerStart,
  };
}

export async function countAcceptedCrewDjsForEvent(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "accepted");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getCrewChatUnlockStateForEvent(
  event: Pick<Event, "id" | "status" | "crew_chat_started_at">,
): Promise<CrewChatUnlockState> {
  const acceptedDjCount = await countAcceptedCrewDjsForEvent(event.id);

  return resolveCrewChatUnlockState(event, acceptedDjCount);
}

export async function getCrewChatUnlockStateByEventIds(
  events: Array<Pick<Event, "id" | "status" | "crew_chat_started_at">>,
): Promise<Map<string, CrewChatUnlockState>> {
  const eventIds = [...new Set(events.map((event) => event.id).filter(Boolean))];
  const unlockByEventId = new Map<string, CrewChatUnlockState>();

  if (eventIds.length === 0) {
    return unlockByEventId;
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "accepted");

  if (error) {
    throw error;
  }

  const acceptedCountByEventId = new Map<string, number>();

  for (const row of data ?? []) {
    const eventId = row.event_id as string | null;

    if (!eventId) {
      continue;
    }

    acceptedCountByEventId.set(eventId, (acceptedCountByEventId.get(eventId) ?? 0) + 1);
  }

  for (const event of events) {
    unlockByEventId.set(
      event.id,
      resolveCrewChatUnlockState(event, acceptedCountByEventId.get(event.id) ?? 0),
    );
  }

  return unlockByEventId;
}

export async function startEventCrewChat(eventId: string): Promise<Event> {
  const { data, error } = await supabase.rpc("start_event_crew_chat", {
    p_event_id: eventId,
  });

  if (error) {
    throw error;
  }

  return data as Event;
}

export async function ensureEventCrewChatAutoStarted(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase.rpc("ensure_event_crew_chat_auto_started", {
    p_event_id: eventId,
  });

  if (error) {
    throw error;
  }

  return (data as Event | null) ?? null;
}

export async function shouldPostCrewChatLineupUpdate(
  event: Pick<Event, "id" | "status" | "crew_chat_started_at">,
  acceptedDjCountOverride?: number,
): Promise<boolean> {
  const acceptedDjCount =
    acceptedDjCountOverride ?? (await countAcceptedCrewDjsForEvent(event.id));

  return resolveCrewChatUnlockState(event, acceptedDjCount).isUnlocked;
}
