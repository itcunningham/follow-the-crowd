import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv(name: string): string {
  const env = readFileSync(".env.local", "utf8");
  const match = env.match(new RegExp(`^${name}=(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

async function main() {
  const sb = createClient(
    loadEnv("NEXT_PUBLIC_SUPABASE_URL"),
    loadEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );

  const { data: events, error } = await sb
    .from("events")
    .select("id, owner_id, name, event_date, set_time, crew_chat_started_at, created_at, status")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  for (const event of events ?? []) {
    const { count } = await sb
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "accepted");

    console.log(
      JSON.stringify({
        id: event.id,
        owner_id: event.owner_id,
        name: event.name,
        event_date: event.event_date,
        set_time: event.set_time,
        crew_chat_started_at: event.crew_chat_started_at,
        created_at: event.created_at,
        acceptedDjCount: count ?? 0,
      }),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
