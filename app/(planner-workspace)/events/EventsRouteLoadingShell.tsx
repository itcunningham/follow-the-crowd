"use client";

import { useState } from "react";
import EventsListAreaLoading from "@/app/components/events/EventsListAreaLoading";

function readRouteSearchParams(): { create: string | null; tab: string | null } {
  if (typeof window === "undefined") {
    return { create: null, tab: null };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    create: params.get("create"),
    tab: params.get("tab"),
  };
}

/** Next.js route loading slot — list skeleton only; chrome mounts once in events layout. */
export default function EventsRouteLoadingShell() {
  const [routeParams] = useState(readRouteSearchParams);

  return (
    <EventsListAreaLoading
      createParam={routeParams.create}
      initialTab={routeParams.tab}
    />
  );
}
