"use client";

import { EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";

type EventsPageLoadingFallbackProps = {
  initialCreate?: string | null;
};

export default function EventsPageLoadingFallback({
  initialCreate = null,
}: EventsPageLoadingFallbackProps) {
  return <EventsPageLoadingShell createParam={initialCreate} />;
}
