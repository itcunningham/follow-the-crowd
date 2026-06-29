import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { result: "Missing OPENAI_API_KEY. Add it to .env.local." },
      { status: 500 },
    );
  }

  const { location, eventType, budget, capacity, vibe } = await request.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert event planner and crowd insight strategist for Follow The Crowd. Generate a concise, actionable event plan for any type of event — corporate, cultural, nightlife, festivals, private gatherings, and more. Include venue or space suggestions, programming ideas, budget breakdown, audience targeting, marketing tips, and a timeline. Format clearly with headings.",
      },
      {
        role: "user",
        content: `Plan an event with:
- Location: ${location || "not specified"}
- Event type / genre: ${eventType || "not specified"}
- Budget: ${budget || "not specified"}
- Expected capacity: ${capacity || "not specified"}
- Vibe / audience feel: ${vibe || "not specified"}`,
      },
    ],
  });

  const result = completion.choices[0]?.message?.content ?? "No response generated.";

  return NextResponse.json({ result });
}
