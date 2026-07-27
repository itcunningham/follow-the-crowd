import { Suspense } from "react";
import EventsListAreaLoading from "@/app/components/events/EventsListAreaLoading";
import EventsRouteLoadingShell from "./EventsRouteLoadingShell";

export default function EventsLoading() {
  return (
    <Suspense fallback={<EventsListAreaLoading locationSearch="" />}>
      <EventsRouteLoadingShell />
    </Suspense>
  );
}
