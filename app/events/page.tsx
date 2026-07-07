import { Suspense } from "react";
import EventsPageLoadingFallback from "./EventsPageLoadingFallback";
import EventsPageClient from "./EventsPageClient";

type EventsPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

function readTabParam(tab: string | string[] | undefined): string | null {
  if (typeof tab === "string") {
    return tab;
  }

  return null;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={<EventsPageLoadingFallback />}>
      <EventsPageClient initialTab={readTabParam(params.tab)} />
    </Suspense>
  );
}
