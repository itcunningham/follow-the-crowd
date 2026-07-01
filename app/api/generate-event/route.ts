import { NextResponse } from "next/server";
import type { EventBrief } from "@/lib/domain/event";
import { createOpenAIEventPlanGenerator } from "@/lib/infrastructure/openai/generate-event-plan";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { result: "Missing OPENAI_API_KEY. Add it to .env.local.", venues: [] },
      { status: 500 },
    );
  }

  const brief: EventBrief = await request.json();
  const generator = createOpenAIEventPlanGenerator(apiKey);
  const result = await generator.generate(brief);

  return NextResponse.json({
    result: result.result,
    venues: result.venues || [],
  });
}
