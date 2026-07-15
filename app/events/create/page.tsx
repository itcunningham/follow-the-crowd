import { redirect } from "next/navigation";

type EventsCreateRedirectPageProps = {
  searchParams: Promise<{
    eventDate?: string | string[];
  }>;
};

function readStringParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  return null;
}

export default async function EventsCreateRedirectPage({
  searchParams,
}: EventsCreateRedirectPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams({ create: "event" });
  const eventDate = readStringParam(params.eventDate);

  if (eventDate) {
    query.set("eventDate", eventDate);
  }

  redirect(`/events?${query.toString()}`);
}
