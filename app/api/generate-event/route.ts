import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "@/lib/api/authenticateSupabaseRequest";
import { parseEventBriefPayload } from "@/lib/api/validateEventBrief";
import { isAiEventGenerationEnabledServer } from "@/lib/featureFlags";
import { createOpenAIEventPlanGenerator } from "@/lib/infrastructure/openai/generate-event-plan";

export async function POST(request: Request) {
  // Hard-disable for beta: feature flag check runs at entry point, before any expensive operations.
  // This ensures: (1) no OpenAI API calls, (2) no authentication processing, (3) no database operations.
  // To verify: with isAiEventGenerationEnabledServer() = false, endpoint returns 404 and
  // createOpenAIEventPlanGenerator (line 38) is never instantiated or called.
  if (!isAiEventGenerationEnabledServer()) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const auth = await authenticateSupabaseRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const brief = parseEventBriefPayload(payload);

  if (!brief) {
    return NextResponse.json({ error: "Invalid event brief." }, { status: 400 });
  }

  const generator = createOpenAIEventPlanGenerator(apiKey);
  const result = await generator.generate(brief);

  return NextResponse.json({
    result: result.result,
    venues: result.venues || [],
  });
}
