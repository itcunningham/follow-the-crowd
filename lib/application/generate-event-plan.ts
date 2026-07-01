import type { EventBrief, EventPlanResult } from "@/lib/domain/event";

export interface EventPlanGenerator {
  generate(brief: EventBrief): Promise<EventPlanResult>;
}

export function buildEventPlanPrompt(brief: EventBrief): string {
  return `Plan an event with:
- Event name: ${brief.eventName || "not specified"}
- Venue: ${brief.venue || "not specified"}
- City: ${brief.city || "not specified"}
- Event type: ${brief.eventType || "not specified"}
- Genre: ${brief.genre || "not specified"}
- Date: ${brief.date || "not specified"}
- Expected capacity: ${brief.capacity || "not specified"}
- Budget: ${brief.budget || "not specified"}`;
}
