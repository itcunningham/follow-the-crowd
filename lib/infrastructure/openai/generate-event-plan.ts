import OpenAI from "openai";
import {
  buildEventPlanPrompt,
  type EventPlanGenerator,
} from "@/lib/application/generate-event-plan";
import { melbourneVenues } from "@/lib/data/melbourneVenues";
import type { EventBrief, EventPlanResult, Venue } from "@/lib/domain/event";

const venueByName = new Map(
  melbourneVenues.map((venue) => [venue.name, venue]),
);

const venueDatasetForPrompt = melbourneVenues.map((venue) => ({
  name: venue.name,
  address: venue.address,
  lat: venue.lat,
  lng: venue.lng,
  rating: venue.rating,
  types: venue.types,
}));

const SYSTEM_PROMPT =
  "You are an expert event planner and crowd insight strategist for Follow The Crowd. " +
  "Generate a concise, actionable event plan for underground and live events — warehouse raves, club nights, festivals, and cultural gatherings. " +
  "Default location is Melbourne, Australia unless specified. Use Australian venues, AUD currency, and local nightlife culture. " +
  "Include venue suggestions, programming ideas, budget breakdown in AUD ($), audience targeting, marketing tips, and a timeline. " +
  "Format clearly with headings. " +
  "All venues must come from the provided Melbourne venue dataset. " +
  "You are ONLY allowed to select venues from the provided Melbourne venue dataset. " +
  "Match venues by exact name only — copy the name character-for-character from the dataset. Never invent, rename, or modify venue names. Never generate fake venues. " +
  "Prioritise venue selection by: (1) capacity fit for the expected attendance, (2) category match with the event type such as club, warehouse, rooftop, live music, or function space using venue types and names, (3) Melbourne CBD proximity when venues are otherwise comparable. " +
  "Select 2–4 venues when suitable matches exist. Use the exact lat and lng from the dataset for each selected venue. " +
  "If no suitable venue exists in the dataset, set result to a brief explanation that includes the exact phrase 'no suitable venue found' and return an empty venues array. " +
  "You MUST respond with valid JSON only, using this exact shape: " +
  '{"result":"full formatted event plan as a string with headings","venues":[{"name":"Exact venue name from dataset","lat":number,"lng":number}]}. ' +
  "Do not wrap JSON in markdown.";

function isValidVenue(value: unknown): value is Venue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const venue = value as Venue;
  return (
    typeof venue.name === "string" &&
    typeof venue.lat === "number" &&
    typeof venue.lng === "number"
  );
}

function resolveVenuesFromDataset(venues: unknown): Venue[] {
  if (!Array.isArray(venues)) {
    return [];
  }

  const resolved: Venue[] = [];

  for (const candidate of venues) {
    if (!isValidVenue(candidate)) {
      continue;
    }

    const datasetVenue = venueByName.get(candidate.name);
    if (!datasetVenue) {
      continue;
    }

    resolved.push({
      name: datasetVenue.name,
      lat: datasetVenue.lat,
      lng: datasetVenue.lng,
    });
  }

  return resolved.slice(0, 4);
}

function parseEventPlanResponse(content: string | null | undefined): EventPlanResult {
  if (!content) {
    return { result: "No response generated.", venues: [] };
  }

  try {
    const parsed = JSON.parse(content) as {
      result?: unknown;
      venues?: unknown;
    };

    const venues = resolveVenuesFromDataset(parsed.venues);

    return {
      result:
        typeof parsed.result === "string" ? parsed.result : "No response generated.",
      venues,
    };
  } catch {
    return { result: content, venues: [] };
  }
}

export function createOpenAIEventPlanGenerator(
  apiKey: string,
): EventPlanGenerator {
  const openai = new OpenAI({ apiKey });

  return {
    async generate(brief: EventBrief): Promise<EventPlanResult> {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `${buildEventPlanPrompt(brief)}

Melbourne venue dataset (select only from this list):
${JSON.stringify(venueDatasetForPrompt)}`,
          },
        ],
      });

      return parseEventPlanResponse(completion.choices[0]?.message?.content);
    },
  };
}
