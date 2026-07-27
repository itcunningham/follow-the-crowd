"use client";

import { useState } from "react";
import { EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";
import { readCachedNavRole } from "@/lib/navigationRoleCache";

/** Route loading for /events — Active/History + list skeleton; title row lives in workspace layout. */
export default function EventsListAreaLoading({
  locationSearch = "",
  initialTab = null,
}: {
  locationSearch?: string;
  initialTab?: string | null;
}) {
  const [role] = useState(() => readCachedNavRole());

  return (
    <EventsPageLoadingShell
      role={role}
      locationSearch={locationSearch}
      initialTab={initialTab}
    />
  );
}
