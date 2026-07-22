import EventsRouteLoadingShell from "./EventsRouteLoadingShell";
import OnboardingGuard from "@/app/components/OnboardingGuard";

export default function EventsLoading() {
  return (
    <OnboardingGuard>
      <EventsRouteLoadingShell />
    </OnboardingGuard>
  );
}
