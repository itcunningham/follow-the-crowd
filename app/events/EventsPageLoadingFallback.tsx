"use client";

import { EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";

type EventsPageLoadingFallbackProps = {
  initialCreate?: string | null;
  initialTab?: string | null;
};

export default function EventsPageLoadingFallback({
  initialCreate = null,
  initialTab = null,
}: EventsPageLoadingFallbackProps) {
  return <EventsPageLoadingShell createParam={initialCreate} initialTab={initialTab} />;
}
