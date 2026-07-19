"use client";

import { useState } from "react";
import { EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";
import { readCachedNavRole } from "@/lib/navigationRoleCache";

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

export default function EventsRouteLoadingShell() {
  const [routeParams] = useState(readRouteSearchParams);

  return (
    <EventsPageLoadingShell
      createParam={routeParams.create}
      initialTab={routeParams.tab}
      role={readCachedNavRole()}
    />
  );
}
