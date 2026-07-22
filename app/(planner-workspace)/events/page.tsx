import EventsPageClient from "./EventsPageClient";

type EventsPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    create?: string | string[];
    eventDate?: string | string[];
  }>;
};

function readStringParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  return null;
}

function readTabParam(tab: string | string[] | undefined): string | null {
  return readStringParam(tab);
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  return (
    <EventsPageClient
      initialTab={readTabParam(params.tab)}
      initialCreate={readStringParam(params.create)}
      initialEventDate={readStringParam(params.eventDate)}
    />
  );
}
