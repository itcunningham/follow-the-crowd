import { readCachedEventOwnerId } from "@/lib/events/eventsListCache";

const eventOwnerIdCache = new Map<string, string | null>();

export function seedEventOwnerId(eventId: string, ownerId: string | null | undefined): void {
  if (!eventId.trim()) {
    return;
  }

  const normalizedOwnerId =
    typeof ownerId === "string" && ownerId.trim() ? ownerId.trim() : null;

  eventOwnerIdCache.set(eventId, normalizedOwnerId);
}

export function seedEventOwnerIdsFromEvents(
  events: ReadonlyArray<{ id: string; owner_id?: string | null }>,
): void {
  for (const event of events) {
    seedEventOwnerId(event.id, event.owner_id);
  }
}

export function getCachedEventOwnerId(eventId: string | undefined): string | null | undefined {
  if (!eventId) {
    return undefined;
  }

  if (eventOwnerIdCache.has(eventId)) {
    return eventOwnerIdCache.get(eventId) ?? null;
  }

  const cachedOwnerId = readCachedEventOwnerId(eventId);

  if (cachedOwnerId !== undefined) {
    eventOwnerIdCache.set(eventId, cachedOwnerId);
    return cachedOwnerId;
  }

  return undefined;
}

export function setCachedEventOwnerId(eventId: string, ownerId: string | null): void {
  eventOwnerIdCache.set(eventId, ownerId);
}
