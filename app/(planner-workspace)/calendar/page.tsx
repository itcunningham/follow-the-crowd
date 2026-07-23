"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import BothRoleCalendarView from "@/app/components/BothRoleCalendarView";
import DjAvailabilityCalendar from "@/app/components/DjAvailabilityCalendar";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import PlannerCalendar from "@/app/components/PlannerCalendar";
import { PlannerWorkspacePage } from "@/app/components/planner/PlannerWorkspaceLayout";
import { EventsCalendarOriginCreateClient } from "@/app/(planner-workspace)/events/EventsPageClient";
import { parseCalendarPageViewTab } from "@/lib/calendar";
import { isCalendarOriginCreateParam } from "@/lib/events/eventsListNavigation";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { canManageEvents, getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";

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
    return <BothRoleCalendarView activeTab={bothCalendarTab} />;
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

export default function CalendarPage() {
  return (
    <OnboardingGuard>
      <Suspense fallback={null}>
        <CalendarPageContent />
      </Suspense>
    </OnboardingGuard>
  );
}

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const createParam = searchParams.get("create");
  const eventDateParam = searchParams.get("eventDate");
  const isCalendarOriginCreate = isCalendarOriginCreateParam(createParam);
  const guardProfile = useGuardProfile();
  const [role, setRole] = useState<UserRole | null>(() => guardProfile?.role ?? null);
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const [loadingRole, setLoadingRole] = useState(
    () => !guardProfile?.role && !readCachedNavRole(),
  );
  const [bothCalendarTab, setBothCalendarTab] = useState<CalendarViewTab>(() =>
    resolveBothCalendarTab(readCalendarViewParam()),
  );
  const pendingCalendarViewScrollYRef = useRef<number | null>(null);
  const displayRole = role ?? guardProfile?.role ?? cachedRole;

  const handleBothCalendarTabChange = useCallback(
    (tab: CalendarViewTab) => {
      if (tab === bothCalendarTab) {
        return;
      }

      pendingCalendarViewScrollYRef.current = window.scrollY;
      setBothCalendarTab(tab);
    },
    [bothCalendarTab],
  );

  useLayoutEffect(() => {
    if (pendingCalendarViewScrollYRef.current === null) {
      return;
    }

    const scrollY = pendingCalendarViewScrollYRef.current;
    pendingCalendarViewScrollYRef.current = null;
    window.scrollTo(0, scrollY);
  }, [bothCalendarTab]);

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);
      setLoadingRole(false);
      return;
    }

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
  }, [guardProfile?.role]);

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
      <CalendarViewTabs activeTab={bothCalendarTab} onChange={handleBothCalendarTabChange} />
    ) : undefined;

  const secondaryControlsPlaceholder =
    displayRole === "promoter" || displayRole === "dj" || displayRole == null;

  if (isCalendarOriginCreate && canManageEvents(displayRole)) {
    return (
      <EventsCalendarOriginCreateClient
        initialCreate={createParam}
        initialEventDate={eventDateParam}
      />
    );
  }

  return (
      <PlannerWorkspacePage
        initialRole={displayRole}
        includeChrome={false}
        secondaryControls={secondaryControls}
        secondaryControlsPlaceholder={secondaryControlsPlaceholder}
      >
        <CalendarWorkspaceBody
          displayRole={displayRole}
          loadingRole={loadingRole}
          bothCalendarTab={bothCalendarTab}
        />
      </PlannerWorkspacePage>
  );
}
