"use client";

import { useEffect, useState } from "react";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerCalendar from "@/app/components/PlannerCalendar";
import {
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

function readCalendarViewParam(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("view");
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

  return displayRole === null ? (
    <PlannerCalendarLoadingCard />
  ) : null;
}

export default function CalendarPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const [loadingRole, setLoadingRole] = useState(true);
  const [bothCalendarTab, setBothCalendarTab] = useState<CalendarViewTab>(() =>
    resolveBothCalendarTab(readCalendarViewParam()),
  );
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

  useEffect(() => {
    const syncCalendarView = () => {
      setBothCalendarTab(resolveBothCalendarTab(readCalendarViewParam()));
    };

    syncCalendarView();
    window.addEventListener("popstate", syncCalendarView);

    return () => {
      window.removeEventListener("popstate", syncCalendarView);
    };
  }, []);

  const secondaryControls =
    displayRole === "both" ? (
      <CalendarViewTabs activeTab={bothCalendarTab} onChange={setBothCalendarTab} />
    ) : undefined;

  const secondaryControlsPlaceholder =
    displayRole === "promoter" || displayRole === "dj" || displayRole == null;

  return (
    <OnboardingGuard>
      <PlannerWorkspacePage
        title="Calendar"
        initialRole={displayRole}
        secondaryControls={secondaryControls}
        secondaryControlsPlaceholder={secondaryControlsPlaceholder}
      >
        <CalendarWorkspaceBody
          displayRole={displayRole}
          loadingRole={loadingRole}
          bothCalendarTab={bothCalendarTab}
        />
      </PlannerWorkspacePage>
    </OnboardingGuard>
  );
}
