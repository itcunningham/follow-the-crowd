"use client";

import { useState } from "react";
import { EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";
import { readCachedNavRole } from "@/lib/navigationRoleCache";

export default function EventsRouteLoadingShell() {
  const [createParam] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("create");
  });

  return <EventsPageLoadingShell createParam={createParam} role={readCachedNavRole()} />;
}
