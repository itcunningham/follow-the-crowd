"use client";

import { useEffect, useState } from "react";
import AppNavigation from "@/app/components/AppNavigation";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerCalendar from "@/app/components/PlannerCalendar";
import {
  PlannerWorkspacePageHeader,
  PLANNER_CALENDAR_SHELL_CLASS,
  PLANNER_WORKSPACE_CONTENT_CLASS,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

export default function CalendarPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const [loadingRole, setLoadingRole] = useState(true);
  const [bothCalendarTab, setBothCalendarTab] = useState<CalendarViewTab>("planner");
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
      <div className={PLANNER_CALENDAR_SHELL_CLASS}>
        <AppNavigation />

        <PlannerWorkspacePageHeader
          title="Calendar"
          initialRole={displayRole}
          showWorkspaceSubNav={showEventsSubNav}
        />

        <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
          {displayRole === "both" ? (
            <>
              <CalendarViewTabs activeTab={bothCalendarTab} onChange={setBothCalendarTab} />
              {bothCalendarTab === "planner" ? (
                <PlannerCalendar description="Your owned events and sent booking requests by date." />
              ) : (
                <DjAvailabilityCalendar description="Manage your availability and received bookings." />
              )}
            </>
          ) : displayRole === "promoter" ? (
            <PlannerCalendar />
          ) : displayRole === "dj" ? (
            <DjAvailabilityCalendar description="Manage your availability and bookings." />
          ) : !loadingRole ? (
            <p className="text-sm text-ftc-text-muted">Calendar is not available for this account</p>
          ) : null}
        </div>
      </div>
    </OnboardingGuard>
  );
}
