"use client";

import { useState } from "react";
import { EventListSkeleton, EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";
import { isCalendarOriginCreateParam } from "@/lib/events/eventsListNavigation";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { canManageEvents } from "@/lib/user/currentUser";

/** List-only loading UI for /events — no duplicated page chrome (header lives in layout). */
export default function EventsListAreaLoading({
  createParam = null,
  initialTab = null,
}: {
  createParam?: string | null;
  initialTab?: string | null;
}) {
  if (isCalendarOriginCreateParam(createParam)) {
    return (
      <EventsPageLoadingShell
        createParam={createParam}
        initialTab={initialTab}
        role={readCachedNavRole()}
      />
    );
  }

  const [role] = useState(() => readCachedNavRole());

  return <EventListSkeleton showPlannerStats={canManageEvents(role)} showFilterPills={false} />;
}
