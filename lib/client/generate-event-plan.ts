import type { EventBrief, EventPlanResult } from "@/lib/domain/event";
import { supabase } from "@/lib/supabaseClient";

export async function requestEventPlan(
  brief: EventBrief,
): Promise<EventPlanResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/generate-event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(brief),
  });

  if (!response.ok) {
    throw new Error("Failed to generate event plan.");
  }

  return response.json();
}
