"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppNavigation from "@/app/components/AppNavigation";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerCalendar from "@/app/components/PlannerCalendar";
import {
  DjCalendarLoadingCard,
  PlannerCalendarLoadingCard,
} from "@/app/components/skeleton/Skeleton";
import {
  PlannerWorkspacePageHeader,
  PLANNER_WORKSPACE_CONTENT_CLASS,
  PLANNER_WORKSPACE_PAGE_SHELL_CLASS,
  PlannerWorkspaceSecondaryControls,
  PlannerWorkspaceSecondaryControlsPlaceholder,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { parseCalendarPageViewTab } from "@/lib/calendar";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

function resolveBothCalendarTab(viewParam: string | null): CalendarViewTab {
  return parseCalendarPageViewTab(viewParam) === "dj" ? "dj" : "planner";
}

function CalendarWorkspaceContent({
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

  if (displayRole === "both") {
    return (
      <>
        <PlannerWorkspaceSecondaryControls>
          <CalendarViewTabs activeTab={bothCalendarTab} onChange={setBothCalendarTab} />
        </PlannerWorkspaceSecondaryControls>
        {bothCalendarTab === "planner" ? (
          <PlannerCalendar description="Your owned events and sent booking requests by date." />
        ) : (
          <DjAvailabilityCalendar description="Manage your availability and received bookings." />
        )}
      </>
    );
  }

  if (displayRole === "promoter") {
    return (
      <>
        <PlannerWorkspaceSecondaryControlsPlaceholder />
        <PlannerCalendar />
      </>
    );
  }

  if (displayRole === "dj") {
    return (
      <>
        <PlannerWorkspaceSecondaryControlsPlaceholder />
        <DjAvailabilityCalendar description="Manage your availability and bookings." />
      </>
    );
  }

  if (!loadingRole) {
    return <p className="text-sm text-ftc-text-muted">Calendar is not available for this account</p>;
  }

  return null;
}

function CalendarWorkspaceFallback({ displayRole }: { displayRole: UserRole | null }) {
  if (displayRole === "both") {
    return (
      <>
        <PlannerWorkspaceSecondaryControls aria-hidden="true">
          <div className="h-[2.375rem]" />
        </PlannerWorkspaceSecondaryControls>
        <PlannerCalendarLoadingCard description="Your owned events and sent booking requests by date." />
      </>
    );
  }

  if (displayRole === "promoter") {
    return (
      <>
        <PlannerWorkspaceSecondaryControlsPlaceholder />
        <PlannerCalendarLoadingCard />
      </>
    );
  }

  if (displayRole === "dj") {
    return (
      <>
        <PlannerWorkspaceSecondaryControlsPlaceholder />
        <DjCalendarLoadingCard />
      </>
    );
  }

  return null;
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

  const showEventsSubNav =
    displayRole === "promoter" || displayRole === "both" || displayRole === "dj";

  return (
    <OnboardingGuard>
      <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
        <AppNavigation />

        <PlannerWorkspacePageHeader
          title="Calendar"
          initialRole={displayRole}
          showWorkspaceSubNav={showEventsSubNav}
        />

        <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
          <Suspense fallback={<CalendarWorkspaceFallback displayRole={displayRole} />}>
            <CalendarWorkspaceContent displayRole={displayRole} loadingRole={loadingRole} />
          </Suspense>
        </div>
      </div>
    </OnboardingGuard>
  );
}
