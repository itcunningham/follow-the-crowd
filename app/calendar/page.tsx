"use client";

import { useEffect, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerCalendar from "@/app/components/PlannerCalendar";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

export default function CalendarPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [bothCalendarTab, setBothCalendarTab] = useState<CalendarViewTab>("planner");

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
      <div className={`min-h-[100dvh] bg-[#070708] text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}>
        <AppNavigation />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 border-b border-zinc-800/80 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
              Calendar
            </p>
            {role === "promoter" || role === "both" ? (
              <div className="mt-4">
                <PlannerEventsSubNav />
              </div>
            ) : null}
          </div>

          {loadingRole ? (
            <p className="text-sm text-zinc-500">Loading calendar...</p>
          ) : role === "both" ? (
            <>
              <CalendarViewTabs activeTab={bothCalendarTab} onChange={setBothCalendarTab} />
              {bothCalendarTab === "planner" ? (
                <PlannerCalendar description="Your owned events and sent booking requests by date." />
              ) : (
                <DjAvailabilityCalendar description="Manage your availability and received bookings." />
              )}
            </>
          ) : role === "promoter" ? (
            <PlannerCalendar />
          ) : role === "dj" ? (
            <DjAvailabilityCalendar description="Manage your availability and bookings." />
          ) : (
            <p className="text-sm text-zinc-500">Calendar is not available for this account.</p>
          )}
        </main>
      </div>
    </OnboardingGuard>
  );
}
