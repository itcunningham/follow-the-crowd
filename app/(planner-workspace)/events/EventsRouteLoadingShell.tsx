"use client";

import { useSearchParams } from "next/navigation";
import EventsListAreaLoading from "@/app/components/events/EventsListAreaLoading";

/** Next.js route loading slot — Active/History + list skeleton via EventsListAreaLoading. */
export default function EventsRouteLoadingShell() {
  const searchParams = useSearchParams();
  const locationSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <EventsListAreaLoading
      locationSearch={locationSearch}
      initialTab={searchParams.get("tab")}
    />
  );
}
