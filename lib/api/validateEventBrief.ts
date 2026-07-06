import type { EventBrief } from "@/lib/domain/event";

const MAX_EVENT_BRIEF_FIELD_LENGTH = 200;

function sanitizeField(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_EVENT_BRIEF_FIELD_LENGTH);
}

export function parseEventBriefPayload(payload: unknown): EventBrief | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  return {
    eventName: sanitizeField(record.eventName),
    venue: sanitizeField(record.venue),
    city: sanitizeField(record.city),
    eventType: sanitizeField(record.eventType),
    genre: sanitizeField(record.genre),
    date: sanitizeField(record.date),
    capacity: sanitizeField(record.capacity),
    budget: sanitizeField(record.budget),
  };
}
