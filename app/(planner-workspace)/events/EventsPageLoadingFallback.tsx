"use client";

import OnboardingGuard from "@/app/components/OnboardingGuard";
import { EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";

type EventsPageLoadingFallbackProps = {
  initialCreate?: string | null;
  initialTab?: string | null;
};

export default function EventsPageLoadingFallback({
  initialCreate = null,
  initialTab = null,
}: EventsPageLoadingFallbackProps) {
  return (
    <OnboardingGuard>
      <EventsPageLoadingShell createParam={initialCreate} initialTab={initialTab} />
    </OnboardingGuard>
  );
}
