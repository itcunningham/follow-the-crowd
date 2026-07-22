import { Suspense, type ReactNode } from "react";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import EventsWorkspaceRouteShell from "./EventsWorkspaceRouteShell";

export default function EventsWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <Suspense fallback={<EventsWorkspaceRouteShell>{children}</EventsWorkspaceRouteShell>}>
        <EventsWorkspaceRouteShell>{children}</EventsWorkspaceRouteShell>
      </Suspense>
    </OnboardingGuard>
  );
}
