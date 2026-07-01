import type { EventBrief, EventPlanResult } from "@/lib/domain/event";

export async function requestEventPlan(
  brief: EventBrief,
): Promise<EventPlanResult> {
  const response = await fetch("/api/generate-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });

  if (!response.ok) {
    throw new Error("Failed to generate event plan.");
  }

  return response.json();
}
