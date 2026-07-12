"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerCalendar from "@/app/components/PlannerCalendar";
import {
  CalendarPageLoadingShell,
  DjCalendarLoadingCard,
  PlannerCalendarLoadingCard,
} from "@/app/components/skeleton/Skeleton";
import { PlannerWorkspacePage } from "@/app/components/planner/PlannerWorkspaceLayout";
import { parseCalendarPageViewTab } from "@/lib/calendar";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

function resolveBothCalendarTab(viewParam: string | null): CalendarViewTab {
  return parseCalendarPageViewTab(viewParam) === "dj" ? "dj" : "planner";
}

function CalendarWorkspaceBody({
  displayRole,
  loadingRole,
  bothCalendarTab,
}: {
  displayRole: UserRole | null;
  loadingRole: boolean;
  bothCalendarTab: CalendarViewTab;
}) {
  if (displayRole === "both") {
    return bothCalendarTab === "planner" ? (
      <PlannerCalendar description="Your owned events and sent booking requests by date." />
    ) : (
      <DjAvailabilityCalendar description="Manage your availability and received bookings." />
    );
  }

  if (displayRole === "promoter") {
    return <PlannerCalendar />;
  }

  if (displayRole === "dj") {
    return <DjAvailabilityCalendar description="Manage your availability and bookings." />;
  }

  if (!loadingRole) {
    return <p className="text-sm text-ftc-text-muted">Calendar is not available for this account</p>;
  }

  return null;
}

function CalendarWorkspaceBodyFallback({
  displayRole,
  bothCalendarTab,
}: {
  displayRole: UserRole | null;
  bothCalendarTab: CalendarViewTab;
}) {
  if (displayRole === "both") {
    return bothCalendarTab === "dj" ? (
      <DjCalendarLoadingCard description="Manage your availability and received bookings." />
    ) : (
      <PlannerCalendarLoadingCard description="Your owned events and sent booking requests by date." />
    );
  }

  if (displayRole === "promoter") {
    return <PlannerCalendarLoadingCard />;
  }

  if (displayRole === "dj") {
    return <DjCalendarLoadingCard />;
  }

  return null;
}

function CalendarPageContent({
  displayRole,
  loadingRole,
}: {
  displayRole: UserRole | null;
  loadingRole: boolean;
}) {
  const searchParams = useSearchParams();
  const calendarViewParam = searchParams.get("view");
  const [bothCalendarTab, setBothCalendarTab] = useState<CalendarViewTab>(() =>
    resolveBothCalendarTab(calendarViewParam),
  );

  useLayoutEffect(() => {
    setBothCalendarTab(resolveBothCalendarTab(calendarViewParam));
  }, [calendarViewParam]);

  const secondaryControls =
    displayRole === "both" ? (
      <CalendarViewTabs activeTab={bothCalendarTab} onChange={setBothCalendarTab} />
    ) : undefined;

  const secondaryControlsPlaceholder =
    displayRole === "promoter" || displayRole === "dj";

  return (
    <PlannerWorkspacePage
      title="Calendar"
      initialRole={displayRole}
      secondaryControls={secondaryControls}
      secondaryControlsPlaceholder={secondaryControlsPlaceholder}
    >
      <Suspense
        fallback={
          <CalendarWorkspaceBodyFallback
            displayRole={displayRole}
            bothCalendarTab={bothCalendarTab}
          />
        }
      >
        <CalendarWorkspaceBody
          displayRole={displayRole}
          loadingRole={loadingRole}
          bothCalendarTab={bothCalendarTab}
        />
      </Suspense>
    </PlannerWorkspacePage>
  );
}

export default function CalendarPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const [loadingRole, setLoadingRole] = useState(true);
  const displayRole = role ?? cachedRole;

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        setRole(profile?.role ?? null);
      })
      .catch((loadError) => {
        console.error("Failed to load calendar role:", loadError);
        setRole(null);
      })
      .finally(() => {
        setLoadingRole(false);
      });
  }, []);

  return (
    <OnboardingGuard>
      <Suspense fallback={<CalendarPageLoadingShell />}>
        <CalendarPageContent displayRole={displayRole} loadingRole={loadingRole} />
      </Suspense>
    </OnboardingGuard>
  );
}
